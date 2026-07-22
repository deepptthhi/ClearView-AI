import axeSource from "axe-core/axe.min.js?raw";
import type { ScanSummary, Severity, Violation } from "../types";

/**
 * Why a sandboxed iframe with NO `allow-same-origin`:
 *
 * axe-core needs a real DOM to inspect, so it has to run inside a browser
 * document — it can't run against a string in a worker. But the HTML we're
 * scanning is arbitrary, untrusted user input. If we gave the iframe
 * `allow-same-origin`, its scripts could reach back into our own page's
 * DOM, cookies, and localStorage.
 *
 * Instead we sandbox with only `allow-scripts`. That keeps the iframe on
 * a unique, opaque origin — its scripts can run (axe needs this) but are
 * cross-origin-isolated from the parent app. The only channel back out is
 * `postMessage`, which we control explicitly below.
 */
const SANDBOX_PERMISSIONS = "allow-scripts";

const SEVERITY_BY_IMPACT: Record<string, Severity> = {
  critical: "critical",
  serious: "serious",
  moderate: "moderate",
  minor: "minor",
};

const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 10,
  serious: 6,
  moderate: 3,
  minor: 1,
};

interface RawAxeResults {
  violations: Array<{
    id: string;
    description: string;
    help: string;
    helpUrl: string;
    impact: string | null;
    tags: string[];
    nodes: Array<{
      html: string;
      target: string[];
      failureSummary?: string;
    }>;
  }>;
  passes: Array<unknown>;
}

function buildScanDocument(userHtml: string): string {
  // The runner script executes *inside* the sandboxed iframe. It waits for
  // the document to settle, runs the audit, then hands results back to the
  // parent window via postMessage — the only communication path we allow.
  const runner = `
    (function () {
      function run() {
        axe.run(document, {
          resultTypes: ["violations", "passes"]
        }).then(function (results) {
          window.parent.postMessage({ source: "a11y-auditor", results: results }, "*");
        }).catch(function (err) {
          window.parent.postMessage({ source: "a11y-auditor", error: String(err) }, "*");
        });
      }
      if (document.readyState === "complete") {
        run();
      } else {
        window.addEventListener("load", run);
      }
    })();
  `;

  return `${userHtml}\n<script>${axeSource}</script>\n<script>${runner}</script>`;
}

export function scanHtml(userHtml: string, timeoutMs = 8000): Promise<ScanSummary> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("sandbox", SANDBOX_PERMISSIONS);
    iframe.style.position = "fixed";
    iframe.style.top = "-9999px";
    iframe.style.left = "-9999px";
    iframe.style.width = "1280px";
    iframe.style.height = "800px";
    iframe.srcdoc = buildScanDocument(userHtml);

    let settled = false;

    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(timer);
      iframe.remove();
    };

    const onMessage = (event: MessageEvent) => {
      if (!event.data || event.data.source !== "a11y-auditor" || settled) return;
      settled = true;

      if (event.data.error) {
        cleanup();
        reject(new Error(event.data.error));
        return;
      }

      const raw = event.data.results as RawAxeResults;
      resolve(normalizeResults(raw));
      cleanup();
    };

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("Scan timed out. The page may rely on scripts that don't finish loading in a sandboxed preview."));
    }, timeoutMs);

    window.addEventListener("message", onMessage);
    document.body.appendChild(iframe);
  });
}

function normalizeResults(raw: RawAxeResults): ScanSummary {
  const violations: Violation[] = raw.violations.map((v) => ({
    id: v.id,
    description: v.description,
    help: v.help,
    helpUrl: v.helpUrl,
    severity: SEVERITY_BY_IMPACT[v.impact ?? "minor"] ?? "minor",
    tags: v.tags,
    nodes: v.nodes.map((n) => ({
      html: n.html,
      target: n.target,
      failureSummary: n.failureSummary ?? "",
    })),
  }));

  const penalty = violations.reduce(
    (sum, v) => sum + SEVERITY_WEIGHT[v.severity] * v.nodes.length,
    0,
  );
  const score = Math.max(0, Math.round(100 - penalty));

  return {
    scannedAt: new Date().toISOString(),
    totalNodesChecked: raw.passes.length + violations.length,
    violations,
    passes: raw.passes.length,
    score,
  };
}

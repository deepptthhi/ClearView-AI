import type { ScanSummary, Severity, Violation } from "../types.js";

// Same weighting as src/lib/axeScanner.ts on the frontend, so a score
// computed from a URL scan is directly comparable to one computed from a
// pasted-HTML scan.
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

export interface RawAxeResults {
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

export function normalizeResults(raw: RawAxeResults, url: string): ScanSummary {
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
    url,
    scannedAt: new Date().toISOString(),
    totalNodesChecked: raw.passes.length + violations.length,
    violations,
    passes: raw.passes.length,
    score,
    documentType: "html",
  };
}

import JSZip from "jszip";
import type { ScanSummary, Violation } from "../../types";
import { buildViolation, findHeadingSkips, VAGUE_LINK_TEXT } from "./shared";

const TEXT_NS = "urn:oasis:names:tc:opendocument:xmlns:text:1.0";
const DRAW_NS = "urn:oasis:names:tc:opendocument:xmlns:drawing:1.0";
const SVG_NS = "urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0";
const TABLE_NS = "urn:oasis:names:tc:opendocument:xmlns:table:1.0";
const DC_NS = "http://purl.org/dc/elements/1.1/";

export async function analyzeOdt(file: ArrayBuffer): Promise<ScanSummary> {
  const zip = await JSZip.loadAsync(file);
  const contentXml = await zip.file("content.xml")?.async("text");
  const metaXml = await zip.file("meta.xml")?.async("text");

  if (!contentXml) {
    throw new Error("Couldn't find content.xml — is this a valid .odt file?");
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(contentXml, "application/xml");
  const violations: Violation[] = [];

  // --- 1. Images missing alt text (svg:desc / svg:title on draw:frame) ---
  const frames = Array.from(doc.getElementsByTagNameNS(DRAW_NS, "frame")).filter(
    (f) => f.getElementsByTagNameNS(DRAW_NS, "image").length > 0,
  );
  const missingAlt = frames.filter((f) => {
    const desc = f.getElementsByTagNameNS(SVG_NS, "desc")[0]?.textContent?.trim();
    const title = f.getElementsByTagNameNS(SVG_NS, "title")[0]?.textContent?.trim();
    return !desc && !title;
  });
  if (missingAlt.length > 0) {
    violations.push(
      buildViolation({
        id: "odt-image-alt",
        description: "Images without a title or description can't be understood by screen reader users.",
        help: "Images must have a text alternative",
        helpUrl: "https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html",
        severity: "critical",
        tags: ["wcag2a", "wcag111"],
        occurrences: missingAlt.map((f, i) => ({
          snippet: `<draw:frame> ${f.getAttribute("draw:name") ?? `Image ${i + 1}`} — no title/description set`,
          location: `Image ${i + 1}`,
        })),
      }),
    );
  }

  // --- 2. Heading hierarchy skips ---
  const headings = Array.from(doc.getElementsByTagNameNS(TEXT_NS, "h"));
  const headingLevels = headings.map((h, idx) => ({
    level: Number(h.getAttribute("text:outline-level") ?? h.getAttributeNS(TEXT_NS, "outline-level") ?? "1"),
    text: h.textContent?.trim() || "(empty heading)",
    index: idx,
  }));
  const skips = findHeadingSkips(headingLevels);
  if (skips.length > 0) {
    violations.push(
      buildViolation({
        id: "odt-heading-skip",
        description: "Skipping heading levels breaks document navigation for screen reader users, who often jump between headings.",
        help: "Heading levels should not be skipped",
        helpUrl: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html",
        severity: "serious",
        tags: ["wcag2a", "wcag131"],
        occurrences: skips.map((s) => ({
          snippet: `"${s.text}" is Heading ${s.to}, but the previous heading was Heading ${s.from}`,
          location: `Heading ${s.index + 1}`,
        })),
      }),
    );
  }

  if (headings.length === 0 && doc.getElementsByTagNameNS(TEXT_NS, "p").length > 5) {
    violations.push(
      buildViolation({
        id: "odt-no-headings",
        description: "This document has no headings at all. Without headings, screen reader users can't navigate or skim the document's structure.",
        help: "Document should use heading paragraph styles",
        helpUrl: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html",
        severity: "moderate",
        tags: ["wcag2a", "wcag131"],
        occurrences: [{ snippet: "No text:h heading elements found", location: "Whole document" }],
      }),
    );
  }

  // --- 3. Tables without a designated header row ---
  const tables = Array.from(doc.getElementsByTagNameNS(TABLE_NS, "table"));
  const tablesMissingHeader = tables.filter(
    (t) => t.getElementsByTagNameNS(TABLE_NS, "table-header-rows").length === 0,
  );
  if (tablesMissingHeader.length > 0) {
    violations.push(
      buildViolation({
        id: "odt-table-header",
        description: "Tables without a marked header row make it hard for screen reader users to understand what each column/row means.",
        help: "Tables should designate a header row",
        helpUrl: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html",
        severity: "moderate",
        tags: ["wcag2a", "wcag131"],
        occurrences: tablesMissingHeader.map((_, i) => ({
          snippet: "Table has no <table:table-header-rows> section (Table → Heading Rows Repeat)",
          location: `Table ${i + 1}`,
        })),
      }),
    );
  }

  // --- 4. Vague hyperlink text ---
  const links = Array.from(doc.getElementsByTagNameNS(TEXT_NS, "a"));
  const vagueLinks = links.filter((a) => VAGUE_LINK_TEXT.has(a.textContent?.trim().toLowerCase() ?? ""));
  if (vagueLinks.length > 0) {
    violations.push(
      buildViolation({
        id: "odt-vague-link",
        description: "Link text like \"click here\" gives no context when read out of order — screen reader users often browse a list of all links.",
        help: "Links should have descriptive text",
        helpUrl: "https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context.html",
        severity: "moderate",
        tags: ["wcag2a", "wcag244"],
        occurrences: vagueLinks.map((a, i) => ({
          snippet: `Link text: "${a.textContent?.trim()}"`,
          location: `Link ${i + 1}`,
        })),
      }),
    );
  }

  // --- 5. Document language ---
  let hasLanguage = false;
  if (metaXml) {
    const metaDoc = parser.parseFromString(metaXml, "application/xml");
    hasLanguage = !!metaDoc.getElementsByTagNameNS(DC_NS, "language")[0]?.textContent?.trim();
  }
  if (!hasLanguage) {
    violations.push(
      buildViolation({
        id: "odt-language",
        description: "Without a declared document language, screen readers may use the wrong pronunciation rules for the entire document.",
        help: "Document language should be set",
        helpUrl: "https://www.w3.org/WAI/WCAG21/Understanding/language-of-page.html",
        severity: "serious",
        tags: ["wcag2a", "wcag311"],
        occurrences: [{ snippet: "No dc:language set in document metadata", location: "Tools → Options → Language" }],
      }),
    );
  }

  return summarize(violations);
}

function summarize(violations: Violation[]): ScanSummary {
  const weight = { critical: 10, serious: 6, moderate: 3, minor: 1 } as const;
  const penalty = violations.reduce((sum, v) => sum + weight[v.severity] * v.nodes.length, 0);
  return {
    scannedAt: new Date().toISOString(),
    totalNodesChecked: violations.reduce((s, v) => s + v.nodes.length, 0),
    violations,
    passes: 0,
    score: Math.max(0, Math.round(100 - penalty)),
  };
}

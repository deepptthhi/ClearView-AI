import JSZip from "jszip";
import type { ScanSummary, Violation } from "../../types";
import { buildViolation, findHeadingSkips, VAGUE_LINK_TEXT } from "./shared";

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const WP_NS = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing";
const DC_NS = "http://purl.org/dc/elements/1.1/";

const HEADING_STYLE = /^Heading(\d)$/;

export async function analyzeDocx(file: ArrayBuffer): Promise<ScanSummary> {
  const zip = await JSZip.loadAsync(file);
  const documentXml = await zip.file("word/document.xml")?.async("text");
  const coreXml = await zip.file("docProps/core.xml")?.async("text");

  if (!documentXml) {
    throw new Error("Couldn't find word/document.xml — is this a valid .docx file?");
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(documentXml, "application/xml");
  const violations: Violation[] = [];

  // --- 1. Images missing alt text (wp:docPr descr attribute) ---
  const docPrNodes = Array.from(doc.getElementsByTagNameNS(WP_NS, "docPr"));
  const missingAlt = docPrNodes.filter((n) => !n.getAttribute("descr")?.trim());
  if (missingAlt.length > 0) {
    violations.push(
      buildViolation({
        id: "docx-image-alt",
        description: "Images without alternative text can't be understood by screen reader users.",
        help: "Images must have a text alternative",
        helpUrl: "https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html",
        severity: "critical",
        tags: ["wcag2a", "wcag111"],
        occurrences: missingAlt.map((n, i) => ({
          snippet: `<image name="${n.getAttribute("name") ?? `Picture ${i + 1}`}"> — no alt text set`,
          location: `Image ${i + 1}`,
        })),
      }),
    );
  }

  // --- 2. Heading hierarchy skips ---
  const paragraphs = Array.from(doc.getElementsByTagNameNS(W_NS, "p"));
  const headingLevels: Array<{ level: number; text: string; index: number }> = [];
  paragraphs.forEach((p, idx) => {
    const pStyle = p.getElementsByTagNameNS(W_NS, "pStyle")[0];
    const styleVal = pStyle?.getAttribute("w:val") ?? pStyle?.getAttributeNS(W_NS, "val");
    const match = styleVal?.match(HEADING_STYLE);
    if (match) {
      const text = Array.from(p.getElementsByTagNameNS(W_NS, "t"))
        .map((t) => t.textContent)
        .join("");
      headingLevels.push({ level: Number(match[1]), text: text || "(empty heading)", index: idx });
    }
  });

  const skips = findHeadingSkips(headingLevels);
  if (skips.length > 0) {
    violations.push(
      buildViolation({
        id: "docx-heading-skip",
        description: "Skipping heading levels (e.g. Heading 1 straight to Heading 3) breaks document navigation for screen reader users, who often jump between headings.",
        help: "Heading levels should not be skipped",
        helpUrl: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html",
        severity: "serious",
        tags: ["wcag2a", "wcag131"],
        occurrences: skips.map((s) => ({
          snippet: `"${s.text}" is styled Heading ${s.to}, but the previous heading was Heading ${s.from}`,
          location: `Paragraph ${s.index + 1}`,
        })),
      }),
    );
  }

  if (headingLevels.length === 0 && paragraphs.length > 5) {
    violations.push(
      buildViolation({
        id: "docx-no-headings",
        description: "This document has no heading styles applied at all. Without headings, screen reader users can't navigate or skim the document's structure.",
        help: "Document should use heading styles",
        helpUrl: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html",
        severity: "moderate",
        tags: ["wcag2a", "wcag131"],
        occurrences: [{ snippet: "No paragraphs use a Heading 1–6 style", location: "Whole document" }],
      }),
    );
  }

  // --- 3. Tables without a designated header row ---
  const tables = Array.from(doc.getElementsByTagNameNS(W_NS, "tbl"));
  const tablesMissingHeader = tables.filter((tbl) => {
    const firstRow = tbl.getElementsByTagNameNS(W_NS, "tr")[0];
    if (!firstRow) return false;
    const trPr = firstRow.getElementsByTagNameNS(W_NS, "trPr")[0];
    const hasHeaderFlag = trPr ? trPr.getElementsByTagNameNS(W_NS, "tblHeader").length > 0 : false;
    return !hasHeaderFlag;
  });
  if (tablesMissingHeader.length > 0) {
    violations.push(
      buildViolation({
        id: "docx-table-header",
        description: "Tables without a marked header row make it hard for screen reader users to understand what each column/row means, especially in long tables.",
        help: "Tables should designate a header row",
        helpUrl: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html",
        severity: "moderate",
        tags: ["wcag2a", "wcag131"],
        occurrences: tablesMissingHeader.map((_, i) => ({
          snippet: "Table has no row marked as a repeating header (Table Properties → Row → Repeat as header row)",
          location: `Table ${i + 1}`,
        })),
      }),
    );
  }

  // --- 4. Vague hyperlink text ---
  const hyperlinks = Array.from(doc.getElementsByTagNameNS(W_NS, "hyperlink"));
  const vagueLinks = hyperlinks.filter((link) => {
    const text = Array.from(link.getElementsByTagNameNS(W_NS, "t"))
      .map((t) => t.textContent)
      .join("")
      .trim()
      .toLowerCase();
    return VAGUE_LINK_TEXT.has(text);
  });
  if (vagueLinks.length > 0) {
    violations.push(
      buildViolation({
        id: "docx-vague-link",
        description: "Link text like \"click here\" gives no context when read out of order — screen reader users often browse a list of all links on a page/document.",
        help: "Links should have descriptive text",
        helpUrl: "https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context.html",
        severity: "moderate",
        tags: ["wcag2a", "wcag244"],
        occurrences: vagueLinks.map((link, i) => ({
          snippet: `Link text: "${link.textContent?.trim()}"`,
          location: `Link ${i + 1}`,
        })),
      }),
    );
  }

  // --- 5. Document language not set ---
  let hasLanguage = false;
  if (coreXml) {
    const coreDoc = parser.parseFromString(coreXml, "application/xml");
    const lang = coreDoc.getElementsByTagNameNS(DC_NS, "language")[0];
    hasLanguage = !!lang?.textContent?.trim();
  }
  if (!hasLanguage) {
    violations.push(
      buildViolation({
        id: "docx-language",
        description: "Without a declared document language, screen readers may use the wrong pronunciation rules for the entire document.",
        help: "Document language should be set",
        helpUrl: "https://www.w3.org/WAI/WCAG21/Understanding/language-of-page.html",
        severity: "serious",
        tags: ["wcag2a", "wcag311"],
        occurrences: [{ snippet: "No dc:language set in document properties", location: "File → Options → Language" }],
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

import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { ScanSummary, Violation } from "../../types";
import { buildViolation, findHeadingSkips } from "./shared";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

interface StructNode {
  role?: string;
  children?: Array<StructNode>;
}

const HEADING_ROLE = /^H(\d)$/;

/**
 * IMPORTANT HONESTY NOTE: pdf.js's public structure-tree API exposes each
 * tagged element's `role` (e.g. "Figure", "H1", "TH") but does NOT expose
 * the `/Alt` attribute text on Figure tags through this high-level API.
 * So we can reliably say "this PDF has an untagged Figure" or "this PDF
 * has no tag tree at all", but we can't verify alt-text *content* the way
 * the docx/odt analyzers can. Where that's the case, we flag it as a
 * manual-review item instead of guessing.
 */
export async function analyzePdf(file: ArrayBuffer): Promise<ScanSummary> {
  const loadingTask = pdfjsLib.getDocument({ data: file });
  const pdf = await loadingTask.promise;
  const violations: Violation[] = [];

  const firstPage = await pdf.getPage(1);
  const textContent = await firstPage.getTextContent();
  const documentLanguage = (textContent as { lang?: string | null }).lang;

  if (!documentLanguage) {
    violations.push(
      buildViolation({
        id: "pdf-language",
        description: "Without a declared document language, screen readers may use the wrong pronunciation rules for the whole PDF.",
        help: "PDF should declare a document language",
        helpUrl: "https://www.w3.org/WAI/WCAG21/Understanding/language-of-page.html",
        severity: "serious",
        tags: ["wcag2a", "wcag311", "pdfua"],
        occurrences: [{ snippet: "No /Lang entry found in the document catalog", location: "Document properties" }],
      }),
    );
  }

  let sawAnyStructTree = false;
  let figureCount = 0;
  const headingLevels: Array<{ level: number; text: string; index: number }> = [];
  let tablesMissingHeaderCount = 0;
  let headingCounter = 0;

  const pageCount = pdf.numPages;
  const scannedPages: number[] = [];

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdf.getPage(pageNum);

    // --- Scanned-page detection: a page with (almost) no extractable text
    // is very likely a scanned image with no OCR text layer at all, which
    // makes it completely unreadable to a screen reader. ---
    const pageText = pageNum === 1 ? textContent : await page.getTextContent();
    const visibleChars = pageText.items.reduce((sum, item) => {
      return sum + ("str" in item ? item.str.trim().length : 0);
    }, 0);
    if (visibleChars < 5) {
      scannedPages.push(pageNum);
    }

    const tree = (await page.getStructTree()) as StructNode | null;
    if (tree && tree.children && tree.children.length > 0) {
      sawAnyStructTree = true;
      walk(tree);
    }

    function walk(node: StructNode) {
      if (node.role === "Figure") figureCount++;

      const headingMatch = node.role?.match(HEADING_ROLE);
      if (headingMatch) {
        headingCounter++;
        headingLevels.push({ level: Number(headingMatch[1]), text: `Heading on page ${pageNum}`, index: headingCounter });
      }

      if (node.role === "Table") {
        const hasTH = containsRole(node, "TH");
        if (!hasTH) tablesMissingHeaderCount++;
      }

      node.children?.forEach(walk);
    }
  }

  if (scannedPages.length > 0) {
    violations.push(
      buildViolation({
        id: "pdf-scanned-no-text",
        description: "These pages have virtually no extractable text — almost always a scanned image with no OCR layer, which makes the content completely invisible to screen readers.",
        help: "Scanned pages need OCR text",
        helpUrl: "https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html",
        severity: "critical",
        tags: ["wcag2a", "wcag111", "pdfua"],
        occurrences: scannedPages.map((p) => ({
          snippet: "No extractable text found on this page",
          location: `Page ${p}`,
        })),
      }),
    );
  }

  if (!sawAnyStructTree) {
    violations.push(
      buildViolation({
        id: "pdf-untagged",
        description: "This PDF has no tag structure at all. Untagged PDFs have no defined reading order and no semantic structure — screen readers can only guess at word order and can't identify headings, lists, or tables.",
        help: "PDF must be tagged for accessibility",
        helpUrl: "https://www.w3.org/TR/WCAG-TECHS/pdf-tagging.html",
        severity: "critical",
        tags: ["pdfua"],
        occurrences: [{ snippet: "No StructTreeRoot found in the document catalog", location: "Whole document" }],
      }),
    );
  } else {
    const skips = findHeadingSkips(headingLevels);
    if (skips.length > 0) {
      violations.push(
        buildViolation({
          id: "pdf-heading-skip",
          description: "Skipping heading levels breaks navigation for screen reader users, who often jump between headings using a rotor/heading list.",
          help: "Heading levels should not be skipped",
          helpUrl: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html",
          severity: "serious",
          tags: ["wcag2a", "wcag131", "pdfua"],
          occurrences: skips.map((s) => ({
            snippet: `A Heading ${s.to} tag follows a Heading ${s.from} tag with nothing in between`,
            location: s.text,
          })),
        }),
      );
    }

    if (figureCount > 0) {
      violations.push(
        buildViolation({
          id: "pdf-figure-alt-manual-check",
          description: `Found ${figureCount} tagged Figure element(s). This tool can confirm images are tagged, but can't read the /Alt attribute text through the browser PDF API — open the PDF in Acrobat's tag editor (or a tool like PAC) and manually verify each has real alt text, not a blank or placeholder value.`,
          help: "Manually verify alt text on tagged figures",
          helpUrl: "https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html",
          severity: "minor",
          tags: ["wcag2a", "wcag111", "pdfua", "manual-review"],
          occurrences: [{ snippet: `${figureCount} Figure tag(s) found across ${pageCount} page(s)`, location: "Whole document" }],
        }),
      );
    }

    if (tablesMissingHeaderCount > 0) {
      violations.push(
        buildViolation({
          id: "pdf-table-header",
          description: "Tables tagged without any TH (header cell) make it hard for screen reader users to understand what each column means.",
          help: "Tables should tag header cells as TH",
          helpUrl: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html",
          severity: "moderate",
          tags: ["wcag2a", "wcag131", "pdfua"],
          occurrences: [{ snippet: `${tablesMissingHeaderCount} Table tag(s) with no TH descendant`, location: "Whole document" }],
        }),
      );
    }
  }

  return summarize(violations);
}

function containsRole(node: StructNode, role: string): boolean {
  if (node.role === role) return true;
  return node.children?.some((c) => containsRole(c, role)) ?? false;
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

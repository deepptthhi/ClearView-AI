import { jsPDF } from "jspdf";
import type {
  AISuggestion,
  ScanSummary,
  Severity,

} from "../types";
import {
  SEVERITY_META,
  SEVERITY_ORDER,
} from "./severity";

const MARGIN = 40;
const HEADER_COLOR = [37, 99, 235];
const BORDER = [229, 231, 235];
const LIGHT = [248, 250, 252];
const DARK = [31, 41, 55];
const MUTED = [107, 114, 128];

function reportBaseName(summary: ScanSummary) {
  const stamp = summary.scannedAt.replace(/[:.]/g, "-");

  const source = summary.url
    ? new URL(summary.url).hostname
    : summary.documentType ?? "scan";

  return `clearview-report-${source}-${stamp}`;
}

function triggerDownload(
  blob: Blob,
  filename: string
) {
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");

  a.href = url;
  a.download = filename;

  document.body.appendChild(a);

  a.click();

  a.remove();

  URL.revokeObjectURL(url);
}

export function downloadJsonReport(
  summary: ScanSummary
) {
  triggerDownload(
    new Blob(
      [JSON.stringify(summary, null, 2)],
      {
        type: "application/json",
      }
    ),
    `${reportBaseName(summary)}.json`
  );
}

function severityColor(
  severity: Severity
) {
  switch (severity) {
    case "critical":
      return [220, 38, 38];

    case "serious":
      return [234, 88, 12];

    case "moderate":
      return [202, 138, 4];

    default:
      return [37, 99, 235];
  }
}

function accessibilityRating(score: number) {
  if (score >= 90) {
    return {
      label: "EXCELLENT",
      color: [22, 163, 74],
    };
  }

  if (score >= 75) {
    return {
      label: "GOOD",
      color: [37, 99, 235],
    };
  }

  if (score >= 60) {
    return {
      label: "FAIR",
      color: [234, 179, 8],
    };
  }

  return {
    label: "NEEDS IMPROVEMENT",
    color: [220, 38, 38],
  };
}

export async function downloadPdfReport(
  summary: ScanSummary,
  suggestions: Record<
    string,
    AISuggestion
  >
) {
  const doc = new jsPDF({
    unit: "pt",
    format: "a4",
  });

  const pageWidth =
    doc.internal.pageSize.getWidth();

  const pageHeight =
    doc.internal.pageSize.getHeight();

  const contentWidth =
    pageWidth - MARGIN * 2;

  let y = 50;

  function nextPage() {
    doc.addPage();
    y = 50;
  }

  function ensureSpace(
    height: number
  ) {
    if (
      y + height >
      pageHeight - 50
    ) {
      nextPage();
    }
  }

  function heading(
    text: string
  ) {
    ensureSpace(35);

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(18);

    doc.setTextColor(
      HEADER_COLOR[0],
      HEADER_COLOR[1],
      HEADER_COLOR[2]
    );

    doc.text(
      text,
      MARGIN,
      y
    );

    y += 28;
  }

  function paragraph(
    text: string,
    size = 10
  ) {
    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(size);

    doc.setTextColor(
      DARK[0],
      DARK[1],
      DARK[2]
    );

    const lines =
      doc.splitTextToSize(
        text,
        contentWidth
      );

    ensureSpace(
      lines.length * 14
    );

    doc.text(
      lines,
      MARGIN,
      y
    );

    y +=
      lines.length * 14 +
      10;
  }

  function statCard(
    x: number,
    title: string,
    value: string,
    color: number[]
  ) {
    doc.setFillColor(
      LIGHT[0],
      LIGHT[1],
      LIGHT[2]
    );

    doc.setDrawColor(
      BORDER[0],
      BORDER[1],
      BORDER[2]
    );

    doc.roundedRect(
      x,
      y,
      220,
      72,
      8,
      8,
      "FD"
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(10);

    doc.setTextColor(
      MUTED[0],
      MUTED[1],
      MUTED[2]
    );

    doc.text(
      title,
      x + 15,
      y + 22
    );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(22);

    doc.setTextColor(
      color[0],
      color[1],
      color[2]
    );

    doc.text(
      value,
      x + 15,
      y + 52
    );
  }

  // ==========================
  // COVER PAGE
  // ==========================

  const rating = accessibilityRating(summary.score);

  // Header background
  doc.setFillColor(
    HEADER_COLOR[0],
    HEADER_COLOR[1],
    HEADER_COLOR[2]
  );

  doc.rect(0, 0, pageWidth, 180, "F");

  // Product Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  doc.setTextColor(255);

  doc.text(
    "ClearView",
    pageWidth / 2,
    60,
    {
      align: "center",
    }
  );

  // Subtitle
  doc.setFontSize(16);

  doc.text(
    "Accessibility Engineering Platform",
    pageWidth / 2,
    88,
    {
      align: "center",
    }
  );

  // Report Type
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);

  doc.text(
    "Enterprise Accessibility Audit Report",
    pageWidth / 2,
    112,
    {
      align: "center",
    }
  );

  // White Score Card

  doc.setFillColor(255, 255, 255);

  doc.roundedRect(
    pageWidth / 2 - 90,
    150,
    180,
    120,
    10,
    10,
    "F"
  );

  // Score

  doc.setFont("helvetica", "bold");
  doc.setFontSize(42);

  doc.setTextColor(
    HEADER_COLOR[0],
    HEADER_COLOR[1],
    HEADER_COLOR[2]
  );

  doc.text(
    `${summary.score}`,
    pageWidth / 2,
    198,
    {
      align: "center",
    }
  );

  // Label

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  doc.setTextColor(
    MUTED[0],
    MUTED[1],
    MUTED[2]
  );

  doc.text(
    "Accessibility Score",
    pageWidth / 2,
    220,
    {
      align: "center",
    }
  );

  // Rating

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);

  doc.setTextColor(
    rating.color[0],
    rating.color[1],
    rating.color[2]
  );

  doc.text(
    rating.label,
    pageWidth / 2,
    245,
    {
      align: "center",
    }
  );

  // Move below score card

  y = 320;

  // Metadata

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);

  doc.setTextColor(
    DARK[0],
    DARK[1],
    DARK[2]
  );

  doc.text("Generated", MARGIN, y);

  doc.setFont("helvetica", "normal");

  doc.text(
    new Date(summary.scannedAt).toLocaleString(),
    150,
    y
  );

  y += 24;

  if (summary.url) {
    doc.setFont("helvetica", "bold");

    doc.text("Source", MARGIN, y);

    doc.setFont("helvetica", "normal");

    const source = doc.splitTextToSize(
      summary.url,
      contentWidth - 120
    );

    doc.text(source, 150, y);

    y += source.length * 14;
  }

  y += 15;

  // Divider

  doc.setDrawColor(
    BORDER[0],
    BORDER[1],
    BORDER[2]
  );

  doc.line(
    MARGIN,
    y,
    pageWidth - MARGIN,
    y
  );

  y += 35;

  // Executive Summary

  heading("Executive Summary");

  paragraph(
    "This enterprise accessibility audit summarizes the accessibility health of the scanned page using automated WCAG analysis together with AI-powered remediation guidance. Prioritize Critical and Serious issues first to improve compliance and the experience for keyboard, screen reader, and assistive technology users."
  );



  const affected =
    summary.violations.reduce(
      (sum, v) =>
        sum + v.nodes.length,
      0
    );

  statCard(
    MARGIN,
    "Accessibility Score",
    `${summary.score}/100`,
    HEADER_COLOR
  );

  statCard(
    pageWidth - 260,
    "Issues Found",
    summary.violations.length.toString(),
    [220, 38, 38]
  );

  y += 90;

  statCard(
    MARGIN,
    "Affected Elements",
    affected.toString(),
    [234, 88, 12]
  );

  statCard(
    pageWidth - 260,
    "Checks Passed",
    summary.passes.toString(),
    [22, 163, 74]
  );

  y += 110;

  heading(
    "Detailed Accessibility Findings"
  );

  for (const severity of SEVERITY_ORDER) {
    const issues = summary.violations.filter(
      (v) => v.severity === severity
    );

    if (!issues.length) continue;

    const color = severityColor(severity);

    ensureSpace(45);

    // Severity Header
    doc.setFillColor(color[0], color[1], color[2]);

    doc.roundedRect(
      MARGIN,
      y,
      contentWidth,
      28,
      6,
      6,
      "F"
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(255);

    doc.text(
      `${SEVERITY_META[severity].label.toUpperCase()} • ${issues.length} ISSUE${issues.length > 1 ? "S" : ""}`,
      MARGIN + 12,
      y + 18
    );

    y += 40;

    for (const violation of issues) {
      const suggestion = suggestions[violation.id];

      const descriptionLines = doc.splitTextToSize(
        violation.description,
        contentWidth - 30
      );

      const helpLines = doc.splitTextToSize(
        violation.help,
        contentWidth - 30
      );

      const htmlSnippet =
        violation.nodes[0]?.html ??
        "No HTML snippet available.";

      const htmlLines = doc.splitTextToSize(
        htmlSnippet,
        contentWidth - 40
      );

      const aiExplanation =
        suggestion?.status === "done"
          ? doc.splitTextToSize(
            suggestion.plainEnglish,
            contentWidth - 50
          )
          : [];

      const aiCode =
        suggestion?.status === "done"
          ? doc.splitTextToSize(
            suggestion.fixedCodeSnippet,
            contentWidth - 50
          )
          : [];

      let cardHeight =
        130 +
        descriptionLines.length * 12 +
        helpLines.length * 12;

      if (htmlLines.length) {
        cardHeight +=
          Math.min(htmlLines.length, 4) * 10 + 30;
      }

      if (suggestion?.status === "done") {
        cardHeight +=
          aiExplanation.length * 11 +
          Math.min(aiCode.length, 5) * 10 +
          80;
      }

      ensureSpace(cardHeight + 25);

      // Card Background

      doc.setFillColor(
        LIGHT[0],
        LIGHT[1],
        LIGHT[2]
      );

      doc.setDrawColor(
        BORDER[0],
        BORDER[1],
        BORDER[2]
      );

      doc.roundedRect(
        MARGIN,
        y,
        contentWidth,
        cardHeight,
        8,
        8,
        "FD"
      );

      let cy = y + 20;

      // Issue Title

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);

      doc.setTextColor(
        DARK[0],
        DARK[1],
        DARK[2]
      );

      doc.text(
        helpLines,
        MARGIN + 15,
        cy
      );

      cy += helpLines.length * 14 + 10;

      // Description

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      doc.setTextColor(
        MUTED[0],
        MUTED[1],
        MUTED[2]
      );

      doc.text(
        descriptionLines,
        MARGIN + 15,
        cy
      );

      cy +=
        descriptionLines.length * 12 +
        15;

      // Metadata

      doc.setFont("helvetica", "bold");
      doc.setTextColor(
        DARK[0],
        DARK[1],
        DARK[2]
      );

      doc.text(
        "Issue ID:",
        MARGIN + 15,
        cy
      );

      doc.setFont("helvetica", "normal");

      doc.text(
        violation.id,
        MARGIN + 80,
        cy
      );

      cy += 18;

      doc.setFont("helvetica", "bold");

      doc.text(
        "Affected Elements:",
        MARGIN + 15,
        cy
      );

      doc.setFont("helvetica", "normal");

      doc.text(
        violation.nodes.length.toString(),
        MARGIN + 130,
        cy
      );

      cy += 18;

      doc.setFont("helvetica", "bold");

      doc.text(
        "WCAG Tags:",
        MARGIN + 15,
        cy
      );

      doc.setFont("helvetica", "normal");

      doc.text(
        violation.tags.join(", "),
        MARGIN + 95,
        cy
      );

      cy += 22;

      doc.setFont("helvetica", "bold");
      doc.setTextColor(
        HEADER_COLOR[0],
        HEADER_COLOR[1],
        HEADER_COLOR[2]
      );

      doc.text(
        "Affected HTML",
        MARGIN + 15,
        cy
      );

      cy += 15;
      // ==========================
      // HTML Preview
      // ==========================

      doc.setFillColor(245, 245, 245);

      const htmlBoxHeight =
        Math.max(35, Math.min(htmlLines.length, 4) * 10 + 15);

      doc.roundedRect(
        MARGIN + 15,
        cy,
        contentWidth - 30,
        htmlBoxHeight,
        4,
        4,
        "F"
      );

      doc.setFont("courier", "normal");
      doc.setFontSize(8);
      doc.setTextColor(
        DARK[0],
        DARK[1],
        DARK[2]
      );

      doc.text(
        htmlLines.slice(0, 4),
        MARGIN + 22,
        cy + 12
      );

      cy += htmlBoxHeight + 18;

      // ==========================
      // AI Explanation
      // ==========================

      if (suggestion?.status === "done") {
        doc.setFillColor(239, 246, 255);

        const aiHeight =
          aiExplanation.length * 11 + 30;

        doc.roundedRect(
          MARGIN + 15,
          cy,
          contentWidth - 30,
          aiHeight,
          5,
          5,
          "F"
        );

        doc.setFont(
          "helvetica",
          "bold"
        );

        doc.setFontSize(11);

        doc.setTextColor(
          HEADER_COLOR[0],
          HEADER_COLOR[1],
          HEADER_COLOR[2]
        );

        doc.text(
          "AI Explanation",
          MARGIN + 25,
          cy + 18
        );

        doc.setFont(
          "helvetica",
          "normal"
        );

        doc.setFontSize(9);

        doc.setTextColor(
          DARK[0],
          DARK[1],
          DARK[2]
        );

        doc.text(
          aiExplanation,
          MARGIN + 25,
          cy + 34
        );

        cy += aiHeight + 18;

        // ==========================
        // Suggested Fix
        // ==========================

        doc.setFont(
          "helvetica",
          "bold"
        );

        doc.setFontSize(11);

        doc.setTextColor(
          HEADER_COLOR[0],
          HEADER_COLOR[1],
          HEADER_COLOR[2]
        );

        doc.text(
          "Suggested Fix",
          MARGIN + 15,
          cy
        );

        cy += 12;

        const codeHeight =
          Math.max(
            35,
            Math.min(aiCode.length, 5) * 10 + 15
          );

        doc.setFillColor(250, 250, 250);

        doc.roundedRect(
          MARGIN + 15,
          cy,
          contentWidth - 30,
          codeHeight,
          5,
          5,
          "F"
        );

        doc.setFont(
          "courier",
          "normal"
        );

        doc.setFontSize(8);

        doc.setTextColor(
          DARK[0],
          DARK[1],
          DARK[2]
        );

        doc.text(
          aiCode.slice(0, 5),
          MARGIN + 22,
          cy + 12
        );

        cy += codeHeight + 18;
      }

      // ==========================
      // WCAG Link
      // ==========================

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(10);

      doc.setTextColor(
        HEADER_COLOR[0],
        HEADER_COLOR[1],
        HEADER_COLOR[2]
      );

      doc.text(
        "WCAG Documentation",
        MARGIN + 15,
        cy
      );

      cy += 14;

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(9);

      doc.setTextColor(30, 64, 175);

      const helpUrlLines =
        doc.splitTextToSize(
          violation.helpUrl,
          contentWidth - 30
        );

      doc.text(
        helpUrlLines,
        MARGIN + 15,
        cy
      );

      y += cardHeight + 20;
    }

    y += 15;
  }

  // ==========================
  // Footer
  // ==========================

  const pages =
    doc.getNumberOfPages();

  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);

    const footerY =
      pageHeight - 25;

    doc.setDrawColor(
      BORDER[0],
      BORDER[1],
      BORDER[2]
    );

    doc.line(
      MARGIN,
      footerY - 10,
      pageWidth - MARGIN,
      footerY - 10
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(9);

    doc.setTextColor(
      MUTED[0],
      MUTED[1],
      MUTED[2]
    );

    doc.text(
      "Generated by ClearView Accessibility Engineering Platform",
      MARGIN,
      footerY
    );

    doc.text(
      `Page ${i} of ${pages}`,
      pageWidth - MARGIN,
      footerY,
      {
        align: "right",
      }
    );
  }

  doc.save(
    `${reportBaseName(summary)}.pdf`
  );
}
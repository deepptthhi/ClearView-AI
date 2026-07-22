import type { Severity, Violation } from "../../types";

interface BuildViolationArgs {
  id: string;
  description: string;
  help: string;
  helpUrl: string;
  severity: Severity;
  tags?: string[];
  occurrences: Array<{ snippet: string; location: string }>;
}

/**
 * Every analyzer (HTML/axe-core, docx, odt, pdf) produces the same
 * `Violation` shape so the UI (IssueList, IssueCard, AI explain button)
 * doesn't need to know or care which file type it's looking at.
 */
export function buildViolation({
  id,
  description,
  help,
  helpUrl,
  severity,
  tags = [],
  occurrences,
}: BuildViolationArgs): Violation {
  return {
    id,
    description,
    help,
    helpUrl,
    severity,
    tags,
    nodes: occurrences.map((o) => ({
      html: o.snippet,
      target: [o.location],
      failureSummary: description,
    })),
  };
}

/** Common list of vague link text used by both the docx and odt checkers. */
export const VAGUE_LINK_TEXT = new Set([
  "click here",
  "here",
  "read more",
  "more",
  "link",
  "this link",
  "learn more",
]);

/** Shared heading-hierarchy-skip check, given an ordered list of heading levels. */
export function findHeadingSkips(levels: Array<{ level: number; text: string; index: number }>) {
  const skips: Array<{ from: number; to: number; text: string; index: number }> = [];
  let previous = 0;
  for (const h of levels) {
    if (previous > 0 && h.level - previous > 1) {
      skips.push({ from: previous, to: h.level, text: h.text, index: h.index });
    }
    previous = h.level;
  }
  return skips;
}

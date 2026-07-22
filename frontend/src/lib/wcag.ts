import type {
  Violation,
  WcagLevel,
  WcagLevelStatus,
} from "../types";

// WCAG tag patterns
const LEVEL_TAG_PATTERNS: Record<WcagLevel, RegExp> = {
  A: /^wcag2?1?2?a$/,
  AA: /^wcag2?1?2?aa$/,
  AAA: /^wcag2?1?2?aaa$/,
};

function tagsForLevel(tags: string[], level: WcagLevel): boolean {
  return tags.some((tag) => LEVEL_TAG_PATTERNS[level].test(tag));
}

export function computeWcagStatus(
  violations: Violation[]
): WcagLevelStatus[] {
  const levels: WcagLevel[] = ["A", "AA", "AAA"];

  return levels.map((level) => {
    // Only violations belonging to THIS level
    const levelViolations = violations.filter((violation) =>
      tagsForLevel(violation.tags, level)
    );

    // Compliance is cumulative
    let compliant = true;

    if (level === "A") {
      compliant = violations.every(
        (v) => !tagsForLevel(v.tags, "A")
      );
    }

    if (level === "AA") {
      compliant = violations.every(
        (v) =>
          !tagsForLevel(v.tags, "A") &&
          !tagsForLevel(v.tags, "AA")
      );
    }

    if (level === "AAA") {
      compliant = violations.every(
        (v) =>
          !tagsForLevel(v.tags, "A") &&
          !tagsForLevel(v.tags, "AA") &&
          !tagsForLevel(v.tags, "AAA")
      );
    }

    return {
      level,
      compliant,
      violationCount: levelViolations.length,
      violations: levelViolations,
    };
  });
}

export interface SeverityBreakdown {
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
}

export function computeSeverityBreakdown(
  violations: Violation[]
): SeverityBreakdown {
  const breakdown: SeverityBreakdown = {
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0,
  };

  for (const violation of violations) {
    breakdown[violation.severity] += violation.nodes.length;
  }

  return breakdown;
}
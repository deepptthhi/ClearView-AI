import type { Severity } from "../types";

export const SEVERITY_ORDER: Severity[] = ["critical", "serious", "moderate", "minor"];

export const SEVERITY_META: Record<Severity, { label: string; color: string; description: string }> = {
  critical: {
    label: "Critical",
    color: "var(--color-critical)",
    description: "Blocks access entirely for some users",
  },
  serious: {
    label: "Serious",
    color: "var(--color-serious)",
    description: "Major barrier, workaround unlikely",
  },
  moderate: {
    label: "Moderate",
    color: "var(--color-moderate)",
    description: "Noticeable friction, workaround possible",
  },
  minor: {
    label: "Minor",
    color: "var(--color-minor)",
    description: "Small inconsistency, low impact",
  },
};

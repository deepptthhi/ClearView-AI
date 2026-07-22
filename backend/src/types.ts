// Mirrors src/types/index.ts on the frontend exactly.

export type Severity = "critical" | "serious" | "moderate" | "minor";

export type WcagLevel = "A" | "AA" | "AAA";

export interface ViolationNode {
  html: string;
  target: string[];
  failureSummary: string;
}

export interface Violation {
  id: string;
  description: string;
  help: string;
  helpUrl: string;
  severity: Severity;
  tags: string[];
  nodes: ViolationNode[];
}

export interface ScanSummary {
  url?: string;
  scannedAt: string;
  totalNodesChecked: number;
  violations: Violation[];
  passes: number;
  score: number;
  documentType?: "html" | "docx" | "odt" | "pdf";
}

/**
 * Used by the Compliance Summary card.
 */
export interface WcagLevelStatus {
  level: WcagLevel;

  /**
   * True when no violations exist for this WCAG level.
   */
  compliant: boolean;

  /**
   * Number of violations at this level
   * including lower conformance levels.
   */
  violationCount: number;

  /**
   * Actual violations.
   * Used for "Show more".
   */
  violations: Violation[];
}

export interface AISuggestion {
  status: "loading" | "done" | "error";
  plainEnglish: string;
  fixedCodeSnippet: string;
}
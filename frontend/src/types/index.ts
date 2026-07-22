// Severity levels straight from axe-core's own taxonomy.
// We keep this as a real union type (not "any") so every component
// that branches on severity gets exhaustiveness-checked by TS.
export type Severity = "critical" | "serious" | "moderate" | "minor";

// One accessibility violation, normalized from axe-core's raw output
// into the shape the rest of the app actually needs.
export interface Violation {
  id: string;
  description: string;
  help: string;
  helpUrl: string;
  severity: Severity;
  tags: string[];
  nodes: ViolationNode[];
}

export interface ViolationNode {
  html: string;
  target: string[];
  failureSummary: string;
}

export type DocumentType = "html" | "docx" | "odt" | "pdf";

export interface ScanSummary {
  url?: string;
  scannedAt: string;
  totalNodesChecked: number;
  violations: Violation[];
  passes: number;
  score: number; // 0-100, derived from violation count + severity weighting
  documentType?: DocumentType;
}

// AI-generated remediation for a single violation. Kept separate from
// Violation itself since it arrives asynchronously and can fail
// independently of the (synchronous, reliable) axe-core scan.
export interface AISuggestion {
  violationId: string;
  plainEnglish: string;
  fixedCodeSnippet: string;
  status: "loading" | "done" | "error";
}

export type InputMode = "paste" | "upload" | "url";

export type WcagLevel = "A" | "AA" | "AAA";

export interface WcagLevelStatus {
  level: WcagLevel;
  compliant: boolean;
  violationCount: number;
  violations: Violation[];
}

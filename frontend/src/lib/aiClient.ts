import type { Violation } from "../types";

// Empty string => relative path (same-origin), used when the backend
// serves the built frontend itself. Set VITE_API_BASE_URL to point
// elsewhere if the frontend and backend are deployed/run separately.
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

export interface AIFix {
  plainEnglish: string;
  fixedCodeSnippet: string;
}

/**
 * Calls our own backend's /api/explain, which proxies the Gemini request
 * server-side. The Gemini API key lives only in the backend's environment
 * (GEMINI_API_KEY) — it's never sent to or bundled into this frontend code,
 * unlike a VITE_-prefixed env var would be.
 */
export async function explainViolation(violation: Violation): Promise<AIFix> {
  const response = await fetch(`${API_BASE}/api/explain`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ violation }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error ?? `Server error (${response.status}) while explaining this violation.`);
  }

  return {
    plainEnglish: data?.plainEnglish ?? "No explanation returned.",
    fixedCodeSnippet: data?.fixedCodeSnippet ?? "",
  };
}

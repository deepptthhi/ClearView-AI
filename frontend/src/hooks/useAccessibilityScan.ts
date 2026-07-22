import { useCallback, useRef, useState } from "react";
import { analyzeDocument, type AnalyzeInput } from "../lib/analyzeDocument";
import { explainViolation } from "../lib/aiClient";
import type { AISuggestion, ScanSummary } from "../types";

type ScanStatus = "idle" | "scanning" | "done" | "error";

export function useAccessibilityScan() {
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [summary, setSummary] = useState<ScanSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Record<string, AISuggestion>>({});

  // Guards against a slow scan resolving after the user already started
  // a newer one — otherwise stale results can flash onto the screen.
  const scanToken = useRef(0);

  const runScan = useCallback(async (input: AnalyzeInput) => {
    const token = ++scanToken.current;
    setStatus("scanning");
    setError(null);
    setSuggestions({});

    try {
      const result = await analyzeDocument(input);
      if (scanToken.current !== token) return;
      setSummary(result);
      setStatus("done");
    } catch (err) {
      if (scanToken.current !== token) return;
      setError(err instanceof Error ? err.message : "Something went wrong while scanning.");
      setStatus("error");
    }
  }, []);

  const requestAISuggestion = useCallback(
    async (violationId: string) => {
      const violation = summary?.violations.find((v) => v.id === violationId);
      if (!violation) return;

      setSuggestions((prev) => ({
        ...prev,
        [violationId]: { violationId, plainEnglish: "", fixedCodeSnippet: "", status: "loading" },
      }));

      try {
        const fix = await explainViolation(violation);
        setSuggestions((prev) => ({
          ...prev,
          [violationId]: { violationId, ...fix, status: "done" },
        }));
      } catch (err) {
        setSuggestions((prev) => ({
          ...prev,
          [violationId]: {
            violationId,
            plainEnglish: err instanceof Error ? err.message : "Couldn't fetch a suggestion.",
            fixedCodeSnippet: "",
            status: "error",
          },
        }));
      }
    },
    [summary],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setSummary(null);
    setError(null);
    setSuggestions({});
  }, []);

  return { status, summary, error, suggestions, runScan, requestAISuggestion, reset };
}

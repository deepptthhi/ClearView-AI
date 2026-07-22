import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { AISuggestion, Severity, Violation } from "../types";
import { SEVERITY_META, SEVERITY_ORDER } from "../lib/severity";
import { IssueCard } from "./IssueCard";

interface Props {
  violations: Violation[];
  suggestions: Record<string, AISuggestion>;
  onRequestSuggestion: (violationId: string) => void;
}

type SortMode = "severity" | "affected-desc" | "alphabetical";

const SORT_LABEL: Record<SortMode, string> = {
  severity: "Severity (highest first)",
  "affected-desc": "Most elements affected",
  alphabetical: "Alphabetical",
};

export function IssueList({
  violations,
  suggestions,
  onRequestSuggestion,
}: Props) {
  const [query, setQuery] = useState("");

  // "all" means show every issue initially
  const [selectedSeverity, setSelectedSeverity] =
    useState<Severity | "all">("all");

  const [sortMode, setSortMode] = useState<SortMode>("severity");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    let result = violations.filter(
      (v) =>
        selectedSeverity === "all" || v.severity === selectedSeverity
    );

    if (q) {
      result = result.filter(
        (v) =>
          v.help.toLowerCase().includes(q) ||
          v.description.toLowerCase().includes(q) ||
          v.id.toLowerCase().includes(q)
      );
    }

    const severityRank = Object.fromEntries(
      SEVERITY_ORDER.map((s, i) => [s, i])
    );

    result = [...result].sort((a, b) => {
      switch (sortMode) {
        case "affected-desc":
          return b.nodes.length - a.nodes.length;

        case "alphabetical":
          return a.help.localeCompare(b.help);

        default:
          return severityRank[a.severity] - severityRank[b.severity];
      }
    });

    return result;
  }, [violations, selectedSeverity, query, sortMode]);

  if (violations.length === 0) {
    return (
      <div className="rounded-lg border border-ink-line bg-ink-raised p-8 text-center">
        <p className="font-display text-lg font-semibold text-good">
          No violations found
        </p>
        <p className="mt-1 text-sm text-muted">
          axe-core catches roughly 30–50% of real-world accessibility issues
          automatically. Pair this with manual keyboard testing for complete
          coverage.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-ink-line bg-ink-raised p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
          />

          <input
            type="text"
            placeholder="Search issues..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-md border border-ink-line bg-ink py-1.5 pl-8 pr-2 text-sm text-paper placeholder:text-muted focus:border-moderate focus:outline-none"
          />
        </div>

        {/* Severity Filter */}
        <div className="flex flex-wrap items-center gap-1.5">

          <button
            onClick={() => setSelectedSeverity("all")}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${selectedSeverity === "all"
              ? "bg-white text-black border-white"
              : "border-ink-line text-muted"
              }`}
          >
            All
          </button>

          {SEVERITY_ORDER.map((severity) => {
            const meta = SEVERITY_META[severity];

            const active = selectedSeverity === severity;

            return (
              <button
                key={severity}
                onClick={() => setSelectedSeverity(severity)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${active
                  ? "border-transparent text-ink"
                  : "border-ink-line text-muted"
                  }`}
                style={active ? { backgroundColor: meta.color } : undefined}
              >
                {meta.label}
              </button>
            );
          })}
        </div>

        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          className="rounded-md border border-ink-line bg-ink px-2 py-1.5 text-xs text-paper focus:border-moderate focus:outline-none"
        >
          {Object.entries(SORT_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              Sort: {label}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-ink-line bg-ink-raised p-6 text-center text-sm text-muted">
          No issues match your filters.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((violation) => (
            <IssueCard
              key={violation.id}
              violation={violation}
              suggestion={suggestions[violation.id]}
              onRequestSuggestion={onRequestSuggestion}
            />
          ))}
        </div>
      )}
    </div>
  );
}
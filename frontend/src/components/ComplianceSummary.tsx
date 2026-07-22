import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import type { Violation } from "../types";
import {
  computeSeverityBreakdown,
  computeWcagStatus,
} from "../lib/wcag";
import {
  SEVERITY_META,
  SEVERITY_ORDER,
} from "../lib/severity";

interface Props {
  violations: Violation[];
}

export function ComplianceSummary({ violations }: Props) {
  const wcagStatus = computeWcagStatus(violations);
  const breakdown = computeSeverityBreakdown(violations);

  const [expandedLevels, setExpandedLevels] = useState<
    Record<string, boolean>
  >({});

  const toggleLevel = (level: string) => {
    setExpandedLevels((prev) => ({
      ...prev,
      [level]: !prev[level],
    }));
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">

      {/* WCAG CONFORMANCE */}

      <div className="rounded-lg border border-ink-line bg-ink-raised p-4">

        <h3 className="mb-4 text-xs font-medium uppercase tracking-wide text-muted">
          WCAG Conformance
        </h3>

        <div className="space-y-3">

          {wcagStatus.map(
            ({
              level,
              compliant,
              violationCount,
              violations,
            }) => (
              <div
                key={level}
                className="rounded-md border border-ink-line p-3"
              >
                <div className="flex items-center justify-between">

                  <span className="font-semibold text-paper">
                    Level {level}
                  </span>

                  {compliant ? (
                    <span className="flex items-center gap-1 text-good text-sm">
                      <CheckCircle2 size={15} />
                      Meets
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-critical text-sm">
                      <XCircle size={15} />
                      {violationCount}{" "}
                      {violationCount === 1 ? "Issue" : "Issues"}
                    </span>
                  )}
                </div>

                {violationCount > 0 && (
                  <div className="mt-3 space-y-2">

                    {/* First issue */}

                    <div className="flex items-start gap-2 text-sm text-paper">
                      <XCircle
                        size={14}
                        className="mt-0.5 text-critical shrink-0"
                      />

                      <span>
                        {violations[0].help}
                      </span>
                    </div>

                    {/* Remaining issues */}

                    {expandedLevels[level] &&
                      violations.slice(1).map((issue) => (
                        <div
                          key={issue.id}
                          className="flex items-start gap-2 text-sm text-paper"
                        >
                          <XCircle
                            size={14}
                            className="mt-0.5 text-critical shrink-0"
                          />

                          <span>
                            {issue.help}
                          </span>
                        </div>
                      ))}

                    {/* Show more */}

                    {violations.length > 1 && (
                      <button
                        onClick={() =>
                          toggleLevel(level)
                        }
                        className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-colors"
                      >
                        {expandedLevels[level] ? (
                          <>
                            <ChevronUp size={14} />
                            Hide
                          </>
                        ) : (
                          <>
                            <ChevronDown size={14} />
                            Show {violations.length - 1} more
                          </>
                        )}
                      </button>
                    )}

                  </div>
                )}
              </div>
            )
          )}

        </div>

      </div>

      {/* Severity Breakdown */}

      <div className="rounded-lg border border-ink-line bg-ink-raised p-4">
        <h3 className="mb-4 text-xs font-medium uppercase tracking-wide text-muted">
          Severity Breakdown
        </h3>

        <div className="space-y-3">
          {SEVERITY_ORDER.map((severity) => {
            const meta = SEVERITY_META[severity];

            return (
              <div
                key={severity}
                className="flex items-center justify-between rounded-md border border-ink-line px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor: meta.color,
                    }}
                  />

                  <span className="text-sm font-medium text-paper">
                    {meta.label}
                  </span>
                </div>

                <span className="text-sm font-semibold text-muted">
                  {breakdown[severity]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
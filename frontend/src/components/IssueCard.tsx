import { useState } from "react";
import {
  ChevronDown,
  ExternalLink,
  Sparkles,
  ShieldAlert,
  Eye,
  Code2,
  Wand2,
  BookOpen,
} from "lucide-react";
import type { AISuggestion, Violation } from "../types";
import { SEVERITY_META } from "../lib/severity";

interface Props {
  violation: Violation;
  suggestion?: AISuggestion;
  onRequestSuggestion: (violationId: string) => void;
}

export function IssueCard({
  violation,
  suggestion,
  onRequestSuggestion,
}: Props) {
  const [open, setOpen] = useState(false);

  const meta = SEVERITY_META[violation.severity];

  const affectedCount = violation.nodes.length;

  const wcagLevel =
    violation.tags.find(
      (tag) =>
        tag.toLowerCase() === "wcag2a" ||
        tag.toLowerCase() === "wcag2aa" ||
        tag.toLowerCase() === "wcag2aaa"
    ) ?? "WCAG";

  return (
    <div
      className="
      overflow-hidden
      rounded-xl
      border
      border-ink-line
      bg-ink-raised
      transition-all
      duration-300
      hover:-translate-y-1
      hover:border-paper/20
      hover:shadow-xl
      "
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="w-full text-left p-5"
      >
        <div className="flex items-start justify-between gap-4">

          {/* LEFT SIDE */}

          <div className="flex flex-1 gap-4">

            <div
              className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{
                backgroundColor: `${meta.color}20`,
              }}
            >
              <ShieldAlert
                size={18}
                style={{
                  color: meta.color,
                }}
              />
            </div>

            <div className="min-w-0 flex-1">

              <div className="mb-3 flex flex-wrap items-center gap-2">

                <span
                  className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
                  style={{
                    backgroundColor: `${meta.color}20`,
                    color: meta.color,
                  }}
                >
                  {meta.label}
                </span>

                <span className="rounded-full border border-ink-line px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-paper">
                  {wcagLevel.replace("wcag", "WCAG ").toUpperCase()}
                </span>

                <span className="flex items-center gap-1 rounded-full border border-ink-line px-3 py-1 text-[11px] text-muted">
                  <Eye size={12} />
                  {affectedCount} Element
                  {affectedCount !== 1 ? "s" : ""}
                </span>

              </div>

              <h3 className="text-lg font-semibold leading-snug text-paper">
                {violation.help}
              </h3>

              <p className="mt-2 text-sm leading-6 text-muted">
                {violation.description}
              </p>

            </div>

          </div>

          <ChevronDown
            size={20}
            className={`mt-1 shrink-0 text-muted transition-transform duration-300 ${open ? "rotate-180" : ""
              }`}
          />

        </div>
      </button>
      {open && (


        <div className="space-y-6 border-t border-ink-line bg-ink/40 p-5">

          {/* Problem */}

          <div className="rounded-xl border border-ink-line bg-ink p-4">

            <div className="mb-3 flex items-center gap-2">

              <ShieldAlert
                size={16}
                className="text-critical"
              />

              <h4 className="font-semibold text-paper">
                Problem
              </h4>

            </div>

            <p className="text-sm leading-6 text-muted">
              {violation.description}
            </p>

          </div>

          {/* Affected Element */}

          <div className="rounded-xl border border-ink-line bg-ink p-4">

            <div className="mb-3 flex items-center gap-2">

              <Code2
                size={16}
                className="text-paper"
              />

              <h4 className="font-semibold text-paper">
                Affected HTML
              </h4>

            </div>

            <pre className="overflow-x-auto rounded-lg bg-black/30 p-4 font-mono text-xs leading-6 text-paper">
              <code>
                {violation.nodes[0]?.html}
              </code>
            </pre>

          </div>

          {/* WCAG */}

          <div className="flex flex-wrap items-center justify-between rounded-xl border border-ink-line bg-ink p-4">

            <div>

              <div className="mb-1 flex items-center gap-2">

                <BookOpen
                  size={15}
                  className="text-minor"
                />

                <span className="font-semibold text-paper">
                  WCAG Documentation
                </span>

              </div>

              <p className="text-sm text-muted">
                Read the official accessibility guidance for this rule.
              </p>

            </div>

            <a
              href={violation.helpUrl}
              target="_blank"
              rel="noreferrer"
              className="
              mt-3
              inline-flex
              items-center
              gap-2
              rounded-lg
              border
              border-ink-line
              px-4
              py-2
              text-sm
              transition
              hover:border-minor
              hover:text-minor
              sm:mt-0
              "
            >
              Open Guide

              <ExternalLink size={15} />

            </a>

          </div>

          {/* AI */}

          <div className="rounded-xl border border-ink-line bg-ink p-4">

            <div className="mb-4 flex items-center gap-2">

              <Sparkles
                size={17}
                className="text-moderate"
              />

              <h4 className="font-semibold text-paper">
                AI Accessibility Assistant
              </h4>

            </div>

            {!suggestion && (

              <button
                type="button"
                onClick={() => onRequestSuggestion(violation.id)}
                className="
                inline-flex
                items-center
                gap-2
                rounded-lg
                border
                border-ink-line
                px-4
                py-2
                text-sm
                transition-all
                duration-300
                hover:border-moderate
                hover:bg-moderate/10
                hover:text-moderate
                "
              >

                <Wand2 size={16} />

                Generate AI Fix

              </button>

            )}

            {suggestion?.status === "loading" && (

              <div className="rounded-lg border border-ink-line bg-black/20 p-4">

                <p className="font-medium text-paper">
                  🤖 Generating Recommendation...
                </p>

                <p className="mt-1 text-sm text-muted">
                  Analyzing accessibility guidelines and preparing an improved solution.
                </p>

              </div>

            )}

            {suggestion?.status === "error" && (

              <div className="rounded-lg border border-critical/40 bg-critical/10 p-4">

                <p className="text-sm text-critical">
                  {suggestion.plainEnglish}
                </p>

              </div>

            )}

            {suggestion?.status === "done" && (

              <div className="space-y-5">

                <div className="rounded-lg border border-good/30 bg-good/10 p-4">

                  <div className="mb-2 flex items-center gap-2">

                    <Sparkles
                      size={15}
                      className="text-good"
                    />

                    <h5 className="font-semibold text-good">
                      AI Explanation
                    </h5>

                  </div>

                  <p className="text-sm leading-6 text-paper">
                    {suggestion.plainEnglish}
                  </p>

                </div>

                <div>

                  <div className="mb-3 flex items-center gap-2">

                    <Code2
                      size={15}
                      className="text-good"
                    />

                    <h5 className="font-semibold text-paper">
                      Suggested Fix
                    </h5>

                  </div>

                  <pre className="overflow-x-auto rounded-lg bg-black/30 p-4 font-mono text-xs leading-6 text-good">

                    <code>

                      {suggestion.fixedCodeSnippet}

                    </code>

                  </pre>

                </div>

              </div>

            )}

          </div>

        </div>

      )}

    </div>

  );

}


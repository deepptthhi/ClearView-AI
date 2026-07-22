import { AlertTriangle } from "lucide-react";
import { Header } from "./components/Header";
import { InputPanel } from "./components/InputPanel";
import { ScoreGauge } from "./components/ScoreGauge";
import { IssueList } from "./components/IssueList";
import { EmptyState } from "./components/EmptyState";
import { ComplianceSummary } from "./components/ComplianceSummary";
import { ReportActions } from "./components/ReportActions";
import { useAccessibilityScan } from "./hooks/useAccessibilityScan";

const DOCUMENT_TYPE_LABEL: Record<string, string> = {
  html: "HTML page",
  docx: "Word document (.docx)",
  odt: "OpenDocument text (.odt)",
  pdf: "PDF",
};

function App() {
  const {
    status,
    summary,
    error,
    suggestions,
    runScan,
    requestAISuggestion,
  } = useAccessibilityScan();

  return (
    <div className="min-h-screen bg-ink">
      <Header />

      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8 md:grid-cols-[380px_1fr]">
        <div className="md:sticky md:top-8 md:self-start">
          <InputPanel
            isScanning={status === "scanning"}
            onScan={runScan}
          />
        </div>

        <div>
          {status === "error" && (
            <div className="flex items-start gap-3 rounded-lg border border-critical/40 bg-critical/10 p-4">
              <AlertTriangle
                size={18}
                className="mt-0.5 shrink-0 text-critical"
              />

              <div>
                <p className="font-medium text-critical">
                  Scan failed
                </p>

                <p className="text-sm text-paper/80">
                  {error}
                </p>
              </div>
            </div>
          )}

          {status === "idle" && <EmptyState />}

          {status === "scanning" && !summary && (
            <div className="flex h-72 items-center justify-center rounded-lg border border-ink-line">
              <p className="text-sm text-muted">
                Running axe-core against your markup…
              </p>
            </div>
          )}

          {summary && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  {summary.documentType && (
                    <p className="text-xs font-medium uppercase tracking-wide text-muted">
                      Scanned as:{" "}
                      {DOCUMENT_TYPE_LABEL[summary.documentType]}
                    </p>
                  )}

                  {summary.url && (
                    <p className="text-xs text-muted">
                      {summary.url}
                    </p>
                  )}
                </div>

                <ReportActions
                  summary={summary}
                  suggestions={suggestions}
                />
              </div>

              <ScoreGauge
                score={summary.score}
                issues={summary.violations.length}
                affectedElements={summary.violations.reduce(
                  (total, violation) =>
                    total + violation.nodes.length,
                  0
                )}
              />

              <ComplianceSummary
                violations={summary.violations}
              />

              <IssueList
                violations={summary.violations}
                suggestions={suggestions}
                onRequestSuggestion={requestAISuggestion}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
import { useState } from "react";
import { FileJson, FileDown, Loader2 } from "lucide-react";
import type { ScanSummary, AISuggestion } from "../types";
import { downloadJsonReport, downloadPdfReport } from "../lib/reportClient";

interface Props {
  summary: ScanSummary;
  suggestions: Record<string, AISuggestion>;
}

export function ReportActions({
  summary,
  suggestions,
}: Props) {
  const [pdfBusy, setPdfBusy] = useState(false);

  const handlePdf = async () => {
    setPdfBusy(true);
    try {
      await downloadPdfReport(summary, suggestions);
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => downloadJsonReport(summary)}
        className="flex items-center gap-1.5 rounded-md border border-ink-line px-3 py-1.5 text-xs font-medium text-paper hover:border-moderate hover:text-moderate"
      >
        <FileJson size={14} />
        Download JSON
      </button>
      <button
        type="button"
        onClick={handlePdf}
        disabled={pdfBusy}
        className="flex items-center gap-1.5 rounded-md border border-ink-line px-3 py-1.5 text-xs font-medium text-paper hover:border-moderate hover:text-moderate disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pdfBusy ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
        {pdfBusy ? "Generating…" : "Download PDF"}
      </button>
    </div>
  );
}

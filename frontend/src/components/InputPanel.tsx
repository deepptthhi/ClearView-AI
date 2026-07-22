import { useRef, useState } from "react";
import { FileUp, ScanLine, FileText, Globe } from "lucide-react";
import type { InputMode } from "../types";
import type { AnalyzeInput } from "../lib/analyzeDocument";
import { detectDocumentType } from "../lib/analyzeDocument";
import { scanUrl } from "../lib/scanClients";

const SAMPLE_HTML = `<div class="card">
  <img src="/hero.jpg">
  <h1>Welcome</h1>
  <div onclick="submit()">Submit</div>
  <input type="text">
  <a href="#" style="color:#999">Read more</a>
</div>`;

const DOCUMENT_TYPE_LABEL: Record<string, string> = {
  html: "HTML page",
  docx: "Word document",
  odt: "OpenDocument text",
  pdf: "PDF",
};

interface Props {
  isScanning: boolean;
  onScan: (input: AnalyzeInput & { violations?: any[] }) => void;
}

function isLikelyUrl(value: string): boolean {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function InputPanel({ isScanning, onScan }: Props) {
  const [mode, setMode] = useState<InputMode>("paste");
  const [html, setHtml] = useState("");
  const [url, setUrl] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const detectedType = uploadedFile ? detectDocumentType(uploadedFile.name) : null;
  const canScan =
    mode === "paste"
      ? html.trim().length > 0
      : mode === "url"
        ? isLikelyUrl(url)
        : !!uploadedFile && !!detectedType;

  const handleScan = async () => {
    if (mode === "paste") {
      onScan({ kind: "html", html });
    } else if (mode === "url") {
      try {
        const data = await scanUrl(url.trim());
        // assume backend returns { violations: Violation[] }
        onScan({ kind: "url", url: url.trim(), violations: data.violations });
      } catch (err) {
        console.error("Scan failed:", err);
      }
    } else if (uploadedFile) {
      onScan({ kind: "file", file: uploadedFile });
    }
  };

  return (
    <div className="rounded-lg border border-ink-line bg-ink-raised">
      <div className="flex border-b border-ink-line">
        <TabButton active={mode === "paste"} onClick={() => setMode("paste")}>
          Paste HTML
        </TabButton>
        <TabButton active={mode === "upload"} onClick={() => setMode("upload")}>
          Upload file
        </TabButton>
        <TabButton active={mode === "url"} onClick={() => setMode("url")}>
          Scan URL
        </TabButton>
      </div>

      <div className="relative overflow-hidden p-4">
        {mode === "paste" ? (
          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            placeholder="Paste a snippet of HTML to audit…"
            spellCheck={false}
            className="h-64 w-full resize-none rounded-md border border-ink-line bg-ink p-3 font-mono text-sm text-paper placeholder:text-muted focus:border-moderate focus:outline-none"
          />
        ) : mode === "url" ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-md border border-dashed border-ink-line px-6 text-center">
            <Globe size={22} className="text-muted" />
            <p className="text-sm text-muted">Enter a live URL to audit</p>
            <input
              type="url"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full max-w-sm rounded-md border border-ink-line bg-ink px-3 py-2 text-sm text-paper placeholder:text-muted focus:border-moderate focus:outline-none"
            />
            <p className="text-xs text-muted">
              Requires the scan server running locally (<code>cd server && npm run dev</code>)
            </p>
          </div>
        ) : (
          <div
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) setUploadedFile(file);
            }}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="flex h-64 cursor-pointer flex-col items-center justify-center gap-3 rounded-md border border-dashed border-ink-line text-center hover:border-moderate"
          >
            {uploadedFile ? (
              <>
                <FileText size={22} className="text-moderate" />
                <p className="text-sm text-paper">{uploadedFile.name}</p>
                <p className="text-xs text-muted">
                  {detectedType
                    ? `Detected as ${DOCUMENT_TYPE_LABEL[detectedType]}`
                    : "Unsupported file type"}
                </p>
              </>
            ) : (
              <>
                <FileUp size={22} className="text-muted" />
                <p className="text-sm text-muted">Drop a file, or click to browse</p>
                <p className="text-xs text-muted">Supports .html, .docx, .odt, .pdf</p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".html,.htm,.docx,.odt,.pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setUploadedFile(file);
              }}
            />
          </div>
        )}

        <div className="mt-3 flex items-center justify-between">
          {mode === "paste" ? (
            <button
              type="button"
              onClick={() => setHtml(SAMPLE_HTML)}
              className="text-xs text-muted underline decoration-dotted underline-offset-4 hover:text-paper"
            >
              Try a sample snippet
            </button>
          ) : (
            <span />
          )}

          <button
            type="button"
            disabled={!canScan || isScanning}
            onClick={handleScan}
            className="flex items-center gap-2 rounded-md bg-moderate px-4 py-2 text-sm font-medium text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ScanLine size={16} />
            {isScanning ? "Scanning…" : "Run audit"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${active
        ? "border-b-2 border-moderate text-paper"
        : "text-muted hover:text-paper"
        }`}
    >
      {children}
    </button>
  );
}

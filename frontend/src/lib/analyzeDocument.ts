import type { DocumentType, ScanSummary } from "../types";

// Each analyzer is dynamically imported so the initial bundle doesn't pay
// for axe-core + JSZip + pdf.js (pdf.js alone is well over 1MB) before the
// user has even chosen what to scan. Only the analyzer actually needed for
// the selected file type gets fetched.

export type AnalyzeInput =
  | { kind: "html"; html: string }
  | { kind: "file"; file: File }
  | { kind: "url"; url: string };

// Empty string => relative path (same-origin), used when the backend
// serves the built frontend itself. Set VITE_API_BASE_URL to point
// elsewhere if the frontend and backend are deployed/run separately
// (e.g. local dev with Vite on :5173 and Express on :4000).
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

const EXTENSION_MAP: Record<string, DocumentType> = {
  html: "html",
  htm: "html",
  docx: "docx",
  odt: "odt",
  pdf: "pdf",
};

export function detectDocumentType(filename: string): DocumentType | null {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_MAP[ext] ?? null;
}

export async function analyzeDocument(input: AnalyzeInput): Promise<ScanSummary & { documentType: DocumentType }> {
  if (input.kind === "html") {
    const { scanHtml } = await import("./axeScanner");
    const result = await scanHtml(input.html);
    return { ...result, documentType: "html" };
  }

  if (input.kind === "url") {
    const result = await scanUrl(input.url);
    return { ...result, documentType: "html" };
  }

  const type = detectDocumentType(input.file.name);
  if (!type) {
    throw new Error(
      `Unsupported file type "${input.file.name.split(".").pop()}". Supported: .html, .docx, .odt, .pdf`,
    );
  }

  if (type === "html") {
    const { scanHtml } = await import("./axeScanner");
    const html = await input.file.text();
    const result = await scanHtml(html);
    return { ...result, documentType: "html" };
  }

  const buffer = await input.file.arrayBuffer();

  switch (type) {
    case "docx": {
      const { analyzeDocx } = await import("./analyzers/docx");
      const result = await analyzeDocx(buffer);
      return { ...result, documentType: "docx" };
    }
    case "odt": {
      const { analyzeOdt } = await import("./analyzers/odt");
      const result = await analyzeOdt(buffer);
      return { ...result, documentType: "odt" };
    }
    case "pdf": {
      const { analyzePdf } = await import("./analyzers/pdf");
      const result = await analyzePdf(buffer);
      return { ...result, documentType: "pdf" };
    }
  }
}

async function scanUrl(url: string): Promise<ScanSummary> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/scan/url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
  } catch {
    throw new Error(
      `Couldn't reach the scan server${API_BASE ? ` at ${API_BASE}` : ""}. Make sure it's running (cd backend && npm run dev).`,
    );
  }

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error ?? `Scan server returned ${response.status}.`);
  }

  return body as ScanSummary;
}

import { ScanEye } from "lucide-react";

export function Header() {
  return (
    <header className="border-b border-ink-line">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-md border border-ink-line bg-ink-raised">
          <ScanEye size={18} strokeWidth={1.75} className="text-moderate" />
        </div>
        <div>
          <h1 className="font-display text-lg font-semibold tracking-tight">Clearview</h1>
          <p className="text-xs text-muted">Accessibility auditor, with plain English fixes</p>
        </div>
      </div>
    </header>
  );
}

import { ScanEye } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex h-full min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-ink-line text-center">
      <ScanEye size={28} className="mb-3 text-muted" />
      <p className="font-display text-base font-semibold text-paper">Nothing scanned yet</p>
      <p className="mt-1 max-w-xs text-sm text-muted">
        Paste or upload HTML on the left, then run an audit to see results here.
      </p>
    </div>
  );
}

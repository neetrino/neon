import type { SyncRunRow } from "@/components/dashboard/types";

export function SyncPanel({ runs }: { runs: SyncRunRow[] }) {
  const last = runs[0];
  if (!last) {
    return (
      <div
        className="glass-card border-amber-200 bg-amber-50/80 px-4 py-2.5 text-sm text-amber-900"
        role="status"
      >
        No sync yet — check <code className="rounded bg-white/80 px-1 text-xs">/api/neon/health</code>{" "}
        or cron.
      </div>
    );
  }

  const ok = last.status === "success";
  return (
    <div
      className={`glass-card px-4 py-2.5 text-sm ${
        ok ? "border-emerald-200 bg-emerald-50/50 text-emerald-950" : "border-red-200 bg-red-50/60 text-red-950"
      }`}
      role="status"
    >
      <span className="font-medium">{ok ? "Synced" : "Sync failed"}</span>
      <span className="text-zinc-600">
        {" · "}
        {last.targetDate.slice(0, 10)} · {last.rowsUpserted ?? "—"} rows
      </span>
      {last.errorMessage ? (
        <span className="mt-1 block text-red-800">{last.errorMessage}</span>
      ) : null}
    </div>
  );
}

export function formatAbbrev(n: number): string {
  if (!Number.isFinite(n)) {
    return "0";
  }
  const abs = Math.abs(n);
  if (abs >= 1e12) {
    return `${(n / 1e12).toFixed(2)}T`;
  }
  if (abs >= 1e9) {
    return `${(n / 1e9).toFixed(2)}B`;
  }
  if (abs >= 1e6) {
    return `${(n / 1e6).toFixed(2)}M`;
  }
  if (abs >= 1e3) {
    return `${(n / 1e3).toFixed(2)}K`;
  }
  return n.toFixed(0);
}

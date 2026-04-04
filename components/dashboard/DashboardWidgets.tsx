import type { SyncRunRow } from "@/components/dashboard/types";

export function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card px-4 py-4">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-zinc-100">{value}</p>
    </div>
  );
}

export function SyncPanel({ runs }: { runs: SyncRunRow[] }) {
  const last = runs[0];
  if (!last) {
    return (
      <div className="glass-card border-amber-500/20 px-4 py-3 text-sm text-amber-200/90">
        No sync runs recorded yet. Confirm API access with{" "}
        <code className="rounded bg-black/30 px-1 py-0.5 text-xs">GET /api/neon/health</code>
        , then trigger{" "}
        <code className="rounded bg-black/30 px-1 py-0.5 text-xs">
          GET /api/cron/sync-neon-usage
        </code>{" "}
        with the cron secret, or wait for Vercel Cron.
      </div>
    );
  }

  const ok = last.status === "success";
  return (
    <div
      className={`glass-card px-4 py-3 text-sm ${
        ok ? "border-emerald-500/20 text-emerald-100/90" : "border-red-500/25 text-red-200/90"
      }`}
    >
      <span className="font-medium">Last sync:</span>{" "}
      <span className="text-zinc-300">{last.status}</span>
      {" · "}
      <span className="text-zinc-400">
        target {last.targetDate.slice(0, 10)} · rows {last.rowsUpserted ?? "—"}
      </span>
      {last.errorMessage ? (
        <span className="mt-1 block text-red-300/90">{last.errorMessage}</span>
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

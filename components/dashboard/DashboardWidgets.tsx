import type { SyncRunRow } from "@/components/dashboard/types";

type SyncPanelProps = {
  runs: SyncRunRow[];
  onSyncNow: () => Promise<void>;
  syncingNow: boolean;
};

export function SyncPanel({ runs, onSyncNow, syncingNow }: SyncPanelProps) {
  const last = runs[0];
  const isRunning = syncingNow || last?.status === "running";

  const statusTone = isRunning
    ? "border-sky-200 bg-sky-50/70 text-sky-900"
    : last?.status === "success"
      ? "border-emerald-200 bg-emerald-50/70 text-emerald-950"
      : "border-red-200 bg-red-50/70 text-red-950";

  const indicatorTone = isRunning
    ? "bg-sky-500"
    : last?.status === "success"
      ? "bg-emerald-500"
      : "bg-red-500";

  const statusLabel = isRunning ? "Synchronizing" : last?.status === "success" ? "Synced" : "Sync failed";

  if (!last) {
    return (
      <div className="inline-flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 px-2.5 py-1.5 text-xs text-amber-900" role="status">
        <span className="truncate">No sync yet</span>
        <button
          type="button"
          onClick={() => void onSyncNow()}
          disabled={syncingNow}
          className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {syncingNow ? "Syncing..." : "Sync now"}
        </button>
      </div>
    );
  }

  return (
    <div className={`inline-flex max-w-full items-center gap-2.5 rounded-xl border px-2.5 py-1.5 text-xs ${statusTone}`} role="status">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${indicatorTone} ${isRunning ? "animate-pulse" : ""}`}
          aria-hidden
        />
        <span className="font-semibold">{statusLabel}</span>
        <span className="truncate text-zinc-700">
          {last.targetDate.slice(0, 10)} · {last.rowsUpserted ?? "—"} rows
        </span>
      </div>
      <button
        type="button"
        onClick={() => void onSyncNow()}
        disabled={syncingNow}
        className="inline-flex shrink-0 items-center justify-center rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {syncingNow ? "Syncing..." : "Sync now"}
      </button>
      {last.errorMessage ? (
        <button
          title={last.errorMessage}
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-red-300 bg-red-100 text-[10px] font-semibold text-red-700"
          aria-label={last.errorMessage}
        >
          !
        </button>
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

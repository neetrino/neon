import type { NeonUsageMetricName } from "@/lib/constants/neon-metrics";
import { NEON_USAGE_METRIC_LABELS, NEON_USAGE_METRICS } from "@/lib/constants/neon-metrics";
import type { ProjectRow, ProjectUsageAggregate } from "@/components/dashboard/types";
import {
  formatTotalsIntegerString,
  sumStorageByteMonthStrings,
} from "@/components/dashboard/usage-display-format";

const TABLE_METRICS: NeonUsageMetricName[] = NEON_USAGE_METRICS.filter(
  (m) => m !== "compute_unit_seconds",
);

function formatAvgPerDay(n: number): string {
  if (!Number.isFinite(n)) {
    return "—";
  }
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function aggregateFor(
  usageByProjectId: Map<string, ProjectUsageAggregate> | null,
  id: string,
): ProjectUsageAggregate | undefined {
  return usageByProjectId?.get(id);
}

function Stat({
  label,
  value,
  large,
}: {
  label: string;
  value: string;
  large?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border border-zinc-100 bg-zinc-50/60 px-3 py-2 ${
        large ? "border-teal-200/60 bg-teal-50/40" : ""
      }`}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p
        className={`mt-1 font-mono text-zinc-900 tabular-nums ${large ? "text-lg font-semibold" : "text-sm"}`}
      >
        {value}
      </p>
    </div>
  );
}

export function ProjectTable({
  projects,
  usageByProjectId,
  calendarDays,
}: {
  projects: ProjectRow[];
  usageByProjectId: Map<string, ProjectUsageAggregate> | null;
  calendarDays: number | null;
}) {
  return (
    <section className="glass-card overflow-hidden">
      <div className="border-b border-zinc-100 px-4 py-4 sm:px-5">
        <h2 className="text-base font-semibold text-zinc-900">Projects</h2>
        <p className="mt-1 text-xs text-zinc-500">Per-project totals for the dates in the sidebar.</p>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {projects.length === 0 ? (
          <p className="text-sm text-zinc-500">No projects yet.</p>
        ) : (
          <ul className="grid list-none gap-4 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
            {projects.map((p) => {
              const u = aggregateFor(usageByProjectId, p.neonProjectId);
              const storageSum = u
                ? formatTotalsIntegerString(sumStorageByteMonthStrings(u.totals).toString())
                : "—";
              const cuTotal = u
                ? formatTotalsIntegerString(u.totals.compute_unit_seconds)
                : usageByProjectId
                  ? "0"
                  : "…";
              const cuDay = u
                ? formatAvgPerDay(u.averagesPerCalendarDay.compute_unit_seconds)
                : usageByProjectId
                  ? formatAvgPerDay(0)
                  : "…";
              return (
                <li
                  key={p.neonProjectId}
                  className="flex flex-col rounded-xl border border-zinc-200/80 bg-white p-4 shadow-sm ring-1 ring-zinc-100"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-base font-semibold text-zinc-900">{p.name}</h3>
                      <p
                        className="mt-1 truncate font-mono text-[11px] text-zinc-400"
                        title={p.neonProjectId}
                      >
                        {p.neonProjectId}
                      </p>
                    </div>
                    {p.regionId ? (
                      <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
                        {p.regionId}
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-3 text-xs text-zinc-500">
                    Last snapshot:{" "}
                    <span className="font-medium text-zinc-700">{p.lastSnapshotDate ?? "—"}</span>
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Stat label="CU·s (period)" value={cuTotal} large />
                    <Stat label="CU·s / day" value={cuDay} />
                    <Stat label="Snapshots (rows)" value={u ? String(u.snapshotRows) : usageByProjectId ? "0" : "…"} />
                    <Stat label="Storage Σ (B·mo)" value={storageSum} />
                  </div>

                  <div className="mt-4 border-t border-zinc-100 pt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                      Other metrics
                    </p>
                    <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                      {TABLE_METRICS.map((m) => (
                        <div key={m} className="flex min-w-0 flex-col">
                          <dt className="truncate text-[11px] text-zinc-500">
                            {NEON_USAGE_METRIC_LABELS[m]}
                          </dt>
                          <dd className="font-mono text-xs text-zinc-800">
                            {u
                              ? formatTotalsIntegerString(u.totals[m])
                              : usageByProjectId
                                ? "0"
                                : "…"}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {calendarDays !== null ? (
        <p className="border-t border-zinc-100 px-4 py-2.5 text-xs text-zinc-400 sm:px-5">
          Averages use <span className="font-medium text-zinc-600">{calendarDays}</span> calendar days
          in range.
        </p>
      ) : null}
    </section>
  );
}

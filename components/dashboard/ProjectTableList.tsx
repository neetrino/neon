import { NEON_USAGE_METRIC_LABELS } from "@/lib/constants/neon-metrics";
import type { ProjectRow, ProjectUsageAggregate } from "@/components/dashboard/types";
import {
  aggregateFor,
  formatAvgPerDay,
  PROJECT_TABLE_METRICS,
} from "@/components/dashboard/project-table-shared";
import {
  formatTotalsIntegerString,
  sumStorageByteMonthStrings,
} from "@/components/dashboard/usage-display-format";

export function ProjectTableList({
  projects,
  usageByProjectId,
}: {
  projects: ProjectRow[];
  usageByProjectId: Map<string, ProjectUsageAggregate> | null;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 shadow-sm [-ms-overflow-style:auto] [scrollbar-gutter:stable]">
      <table className="w-full min-w-[960px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-100">
            <th className="sticky left-0 z-[1] bg-zinc-100 px-3 py-3 text-xs font-bold uppercase tracking-wide text-zinc-600 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)]">
              Project
            </th>
            <th className="px-3 py-3 text-xs font-bold uppercase tracking-wide text-zinc-600">Region</th>
            <th className="px-3 py-3 text-xs font-bold uppercase tracking-wide text-zinc-600">
              Last snap
            </th>
            <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wide text-zinc-600">
              CU·s
            </th>
            <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wide text-zinc-600">
              CU·s/d
            </th>
            <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wide text-zinc-600">
              Rows
            </th>
            <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wide text-zinc-600">
              Storage
            </th>
            {PROJECT_TABLE_METRICS.map((m) => (
              <th
                key={m}
                className="max-w-[8rem] px-2 py-3 text-right text-[10px] font-bold uppercase leading-tight text-zinc-600"
              >
                {NEON_USAGE_METRIC_LABELS[m]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {projects.map((p, idx) => {
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
            const stripe = idx % 2 === 0 ? "bg-white" : "bg-zinc-50/80";
            return (
              <tr
                key={p.neonProjectId}
                className={`border-b border-zinc-100 ${stripe} hover:bg-teal-50/60`}
              >
                <td
                  className={`sticky left-0 z-[1] whitespace-nowrap border-r border-zinc-100 px-3 py-3 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.08)] ${stripe} hover:bg-teal-50/60`}
                >
                  <div className="font-bold text-zinc-900">{p.name}</div>
                  <div
                    className="mt-0.5 max-w-[14rem] truncate font-mono text-[10px] text-zinc-500"
                    title={p.neonProjectId}
                  >
                    {p.neonProjectId}
                  </div>
                </td>
                <td className="px-3 py-3 text-zinc-600">{p.regionId ?? "—"}</td>
                <td className="whitespace-nowrap px-3 py-3 text-zinc-600">
                  {p.lastSnapshotDate ?? "—"}
                </td>
                <td className="px-3 py-3 text-right font-mono text-sm font-semibold text-zinc-900">
                  {cuTotal}
                </td>
                <td className="px-3 py-3 text-right font-mono text-sm text-zinc-700">{cuDay}</td>
                <td className="px-3 py-3 text-right font-mono text-xs text-zinc-600">
                  {u ? String(u.snapshotRows) : usageByProjectId ? "0" : "…"}
                </td>
                <td className="px-3 py-3 text-right font-mono text-xs text-zinc-800">{storageSum}</td>
                {PROJECT_TABLE_METRICS.map((m) => (
                  <td
                    key={m}
                    className="max-w-[7rem] px-2 py-3 text-right font-mono text-xs text-zinc-700"
                  >
                    {u ? formatTotalsIntegerString(u.totals[m]) : usageByProjectId ? "0" : "…"}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

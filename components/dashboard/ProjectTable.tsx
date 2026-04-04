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
      <div className="border-b border-zinc-100 px-4 py-3 sm:px-5">
        <h2 className="text-sm font-semibold text-zinc-900">Projects</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="bg-zinc-50/80 text-xs font-medium text-zinc-500">
            <tr>
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">ID</th>
              <th className="px-4 py-2.5">Region</th>
              <th className="px-4 py-2.5">Last snap</th>
              <th className="px-4 py-2.5">Rows</th>
              <th className="px-4 py-2.5">CU·s</th>
              <th className="px-4 py-2.5">CU·s/d</th>
              <th className="px-4 py-2.5">Storage Σ</th>
              {TABLE_METRICS.map((m) => (
                <th key={m} className="px-4 py-2.5 whitespace-nowrap">
                  {NEON_USAGE_METRIC_LABELS[m]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 text-zinc-700">
            {projects.map((p) => {
              const u = aggregateFor(usageByProjectId, p.neonProjectId);
              const storageSum = u
                ? formatTotalsIntegerString(sumStorageByteMonthStrings(u.totals).toString())
                : "—";
              return (
                <tr key={p.neonProjectId} className="hover:bg-zinc-50/80">
                  <td className="px-4 py-2.5 font-medium text-zinc-900">{p.name}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-zinc-500">{p.neonProjectId}</td>
                  <td className="px-4 py-2.5 text-zinc-500">{p.regionId ?? "—"}</td>
                  <td className="px-4 py-2.5 text-zinc-600">{p.lastSnapshotDate ?? "—"}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-zinc-600">
                    {u ? String(u.snapshotRows) : usageByProjectId ? "0" : "…"}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-zinc-900">
                    {u
                      ? formatTotalsIntegerString(u.totals.compute_unit_seconds)
                      : usageByProjectId
                        ? "0"
                        : "…"}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-zinc-600">
                    {u
                      ? formatAvgPerDay(u.averagesPerCalendarDay.compute_unit_seconds)
                      : usageByProjectId
                        ? formatAvgPerDay(0)
                        : "…"}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-zinc-800">{storageSum}</td>
                  {TABLE_METRICS.map((m) => (
                    <td key={m} className="px-4 py-2.5 font-mono text-xs text-zinc-600">
                      {u
                        ? formatTotalsIntegerString(u.totals[m])
                        : usageByProjectId
                          ? "0"
                          : "…"}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {calendarDays !== null ? (
        <p className="border-t border-zinc-100 px-4 py-2 text-xs text-zinc-400 sm:px-5">
          {calendarDays} days in range
        </p>
      ) : null}
    </section>
  );
}

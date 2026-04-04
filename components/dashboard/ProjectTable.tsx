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
      <div className="border-b border-white/10 px-5 py-4">
        <h2 className="text-lg font-medium text-zinc-100">Projects &amp; period totals</h2>
        <p className="text-sm text-zinc-500">
          Numbers match summed Neon daily snapshots in the selected range. Consumption API is
          per Neon <span className="text-zinc-400">project</span> (not each database). Compute
          is <span className="text-zinc-400">CU·seconds</span>; there is no separate RAM line in
          v2—storage columns use <span className="text-zinc-400">byte·month</span> units. Averages
          divide by calendar days in the range.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="bg-zinc-900/60 text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Project ID</th>
              <th className="px-4 py-3 font-medium">Region</th>
              <th className="px-4 py-3 font-medium">Last snap</th>
              <th className="px-4 py-3 font-medium">Rows</th>
              <th className="px-4 py-3 font-medium">CU·s total</th>
              <th className="px-4 py-3 font-medium">CU·s / day</th>
              <th className="px-4 py-3 font-medium">Storage Σ (B·mo)</th>
              {TABLE_METRICS.map((m) => (
                <th key={m} className="px-4 py-3 font-medium whitespace-nowrap">
                  {NEON_USAGE_METRIC_LABELS[m]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-zinc-300">
            {projects.map((p) => {
              const u = aggregateFor(usageByProjectId, p.neonProjectId);
              const storageSum = u
                ? formatTotalsIntegerString(sumStorageByteMonthStrings(u.totals).toString())
                : "—";
              return (
                <tr key={p.neonProjectId} className="hover:bg-zinc-800/40">
                  <td className="px-4 py-3 font-medium text-zinc-100">{p.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">{p.neonProjectId}</td>
                  <td className="px-4 py-3 text-zinc-500">{p.regionId ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-400">{p.lastSnapshotDate ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                    {u ? String(u.snapshotRows) : usageByProjectId ? "0" : "…"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-200">
                    {u
                      ? formatTotalsIntegerString(u.totals.compute_unit_seconds)
                      : usageByProjectId
                        ? "0"
                        : "…"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                    {u
                      ? formatAvgPerDay(u.averagesPerCalendarDay.compute_unit_seconds)
                      : usageByProjectId
                        ? formatAvgPerDay(0)
                        : "…"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-200">{storageSum}</td>
                  {TABLE_METRICS.map((m) => (
                    <td key={m} className="px-4 py-3 font-mono text-xs text-zinc-400">
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
        <p className="border-t border-white/5 px-5 py-3 text-xs text-zinc-600">
          Calendar days in range: {calendarDays} (used for CU·s/day and other /day averages).
        </p>
      ) : null}
    </section>
  );
}

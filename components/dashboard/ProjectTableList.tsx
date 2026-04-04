import { NEON_USAGE_METRIC_LABELS } from '@/lib/constants/neon-metrics';
import type { ProjectRow, ProjectUsageAggregate } from '@/components/dashboard/types';
import {
  aggregateFor,
  formatAvgPerDay,
  PROJECT_TABLE_METRICS,
} from '@/components/dashboard/project-table-shared';
import { formatTotalsIntegerString } from '@/components/dashboard/usage-display-format';

function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

function ProviderBadge({ provider }: { provider: 'neon' | 'vercel' }) {
  if (provider === 'vercel') {
    return (
      <span className="rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
        Vercel
      </span>
    );
  }
  return (
    <span className="rounded-md border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-800">
      Neon
    </span>
  );
}

export function ProjectTableList({
  projects,
  usageByProjectId,
  showProviderBadge,
}: {
  projects: ProjectRow[];
  usageByProjectId: Map<string, ProjectUsageAggregate> | null;
  showProviderBadge?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 shadow-sm [-ms-overflow-style:auto] [scrollbar-gutter:stable]">
      <table className="w-full min-w-[960px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-100">
            <th className="sticky left-0 z-[1] bg-zinc-100 px-3 py-3 text-xs font-bold uppercase tracking-wide text-zinc-600 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)]">
              Project
            </th>
            {showProviderBadge ? (
              <th className="px-3 py-3 text-xs font-bold uppercase tracking-wide text-zinc-600">
                Provider
              </th>
            ) : null}
            <th className="px-3 py-3 text-xs font-bold uppercase tracking-wide text-zinc-600">
              Region
            </th>
            <th className="px-3 py-3 text-xs font-bold uppercase tracking-wide text-zinc-600">
              Last snap
            </th>
            <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wide text-zinc-600">
              Est. total $
            </th>
            <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wide text-zinc-600">
              CU-hrs
            </th>
            <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wide text-zinc-600">
              CU-hrs/d
            </th>
            <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wide text-zinc-600">
              Rows
            </th>
            <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wide text-zinc-600">
              Storage avg GB
            </th>
            <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wide text-zinc-600">
              Compute $
            </th>
            <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wide text-zinc-600">
              Bandwidth $
            </th>
            <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wide text-zinc-600">
              Fn $
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
            const isVercel = p.provider === 'vercel';
            const stripe = idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50/80';

            const estTotal = isVercel
              ? u?.vercelCost
                ? formatUsd(u.vercelCost.totalUsd)
                : usageByProjectId
                  ? '$0.00'
                  : '…'
              : u
                ? formatUsd(u.estimatedCost!.totalUsd)
                : usageByProjectId
                  ? '$0.00'
                  : '…';

            const cuTotal = isVercel
              ? '—'
              : u
                ? u.normalizedTotals!.computeCuHours.toFixed(2)
                : usageByProjectId
                  ? '0'
                  : '…';

            const cuDay = isVercel
              ? '—'
              : u
                ? formatAvgPerDay(u.averagesPerCalendarDay!.compute_unit_seconds / 3600)
                : usageByProjectId
                  ? formatAvgPerDay(0)
                  : '…';

            const storageAvgGb = isVercel
              ? '—'
              : u
                ? u.normalizedTotals!.storageAvgGb.toFixed(2)
                : usageByProjectId
                  ? '0.00'
                  : '…';

            const estCompute = isVercel
              ? '—'
              : u
                ? formatUsd(u.estimatedCost!.computeUsd)
                : usageByProjectId
                  ? '$0.00'
                  : '…';

            const bwUsd = isVercel
              ? u?.vercelCost
                ? formatUsd(u.vercelCost.bandwidthUsd)
                : '—'
              : '—';

            const fnUsd = isVercel
              ? u?.vercelCost
                ? formatUsd(u.vercelCost.functionUsd + u.vercelCost.edgeFunctionUsd)
                : '—'
              : '—';

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
                {showProviderBadge ? (
                  <td className="px-3 py-3">
                    <ProviderBadge provider={p.provider} />
                  </td>
                ) : null}
                <td className="px-3 py-3 text-zinc-600">{p.regionId ?? '—'}</td>
                <td className="whitespace-nowrap px-3 py-3 text-zinc-600">
                  {p.lastSnapshotDate ?? '—'}
                </td>
                <td className="px-3 py-3 text-right font-mono text-sm font-semibold text-zinc-900">
                  {estTotal}
                </td>
                <td className="px-3 py-3 text-right font-mono text-sm font-semibold text-zinc-900">
                  {cuTotal}
                </td>
                <td className="px-3 py-3 text-right font-mono text-sm text-zinc-700">{cuDay}</td>
                <td className="px-3 py-3 text-right font-mono text-xs text-zinc-600">
                  {u ? String(u.snapshotRows) : usageByProjectId ? '0' : '…'}
                </td>
                <td className="px-3 py-3 text-right font-mono text-xs text-zinc-800">
                  {storageAvgGb}
                </td>
                <td className="px-3 py-3 text-right font-mono text-xs text-zinc-800">
                  {estCompute}
                </td>
                <td className="px-3 py-3 text-right font-mono text-xs text-zinc-800">{bwUsd}</td>
                <td className="px-3 py-3 text-right font-mono text-xs text-zinc-800">{fnUsd}</td>
                {PROJECT_TABLE_METRICS.map((m) => (
                  <td
                    key={m}
                    className="max-w-[7rem] px-2 py-3 text-right font-mono text-xs text-zinc-700"
                  >
                    {isVercel
                      ? '—'
                      : u
                        ? formatTotalsIntegerString(u.rawTotals![m])
                        : usageByProjectId
                          ? '0'
                          : '…'}
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

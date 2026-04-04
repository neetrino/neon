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

function Stat({ label, value, large }: { label: string; value: string; large?: boolean }) {
  return (
    <div
      className={`rounded-lg border px-3 py-2.5 ${
        large ? 'border-teal-200 bg-teal-50/70 shadow-sm' : 'border-zinc-200 bg-white shadow-sm'
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p
        className={`mt-1 font-mono tabular-nums text-zinc-900 ${large ? 'text-xl font-bold' : 'text-sm font-semibold'}`}
      >
        {value}
      </p>
    </div>
  );
}

function ProviderBadge({ provider }: { provider: 'neon' | 'vercel' }) {
  if (provider === 'vercel') {
    return (
      <span className="shrink-0 rounded-md border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm">
        Vercel
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800 shadow-sm">
      Neon
    </span>
  );
}

function VercelCard({
  p,
  u,
}: {
  p: ProjectRow;
  u: ProjectUsageAggregate | undefined;
}) {
  const totalUsd = u?.vercelCost?.totalUsd ?? null;
  const bwUsd = u?.vercelCost?.bandwidthUsd ?? null;
  const fnUsd = u?.vercelCost?.functionUsd ?? null;
  const edgeUsd = u?.vercelCost?.edgeFunctionUsd ?? null;
  const buildUsd = u?.vercelCost?.buildUsd ?? null;

  return (
    <li className="flex flex-col overflow-hidden rounded-xl border-2 border-zinc-300 bg-white shadow-md">
      <div className="border-b-2 border-zinc-200 bg-gradient-to-r from-slate-600/10 via-slate-50/40 to-zinc-50 px-4 py-3.5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3
              className="text-lg font-bold leading-snug tracking-tight text-zinc-900 sm:text-xl"
              title={p.name}
            >
              {p.name}
            </h3>
            <p
              className="mt-1.5 truncate font-mono text-[11px] text-zinc-500"
              title={p.neonProjectId}
            >
              {p.neonProjectId}
            </p>
          </div>
          <ProviderBadge provider="vercel" />
        </div>
        <p className="mt-2 text-xs text-zinc-600">
          Last snapshot:{' '}
          <span className="font-semibold text-zinc-800">{p.lastSnapshotDate ?? '—'}</span>
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          <Stat
            label="Total charges"
            value={totalUsd !== null ? formatUsd(totalUsd) : '…'}
            large
          />
          <Stat label="Bandwidth $" value={bwUsd !== null ? formatUsd(bwUsd) : '—'} />
          <Stat label="Functions $" value={fnUsd !== null ? formatUsd(fnUsd) : '—'} />
          <Stat label="Edge Functions $" value={edgeUsd !== null ? formatUsd(edgeUsd) : '—'} />
          <Stat label="Build $" value={buildUsd !== null ? formatUsd(buildUsd) : '—'} />
        </div>
      </div>
    </li>
  );
}

export function ProjectTableCards({
  projects,
  usageByProjectId,
  showProviderBadge,
}: {
  projects: ProjectRow[];
  usageByProjectId: Map<string, ProjectUsageAggregate> | null;
  showProviderBadge?: boolean;
}) {
  return (
    <ul className="grid list-none gap-5 sm:grid-cols-2 2xl:grid-cols-3">
      {projects.map((p) => {
        const u = aggregateFor(usageByProjectId, p.neonProjectId);

        if (p.provider === 'vercel') {
          return <VercelCard key={p.neonProjectId} p={p} u={u} />;
        }

        const cuTotal = u
          ? u.normalizedTotals!.computeCuHours.toFixed(2)
          : usageByProjectId
            ? '0'
            : '…';
        const cuDay = u
          ? formatAvgPerDay(u.averagesPerCalendarDay!.compute_unit_seconds / 3600)
          : usageByProjectId
            ? formatAvgPerDay(0)
            : '…';
        const storageAvg = u ? u.normalizedTotals!.storageAvgGb.toFixed(2) : '—';
        const estCost = u ? formatUsd(u.estimatedCost!.totalUsd) : usageByProjectId ? '$0.00' : '…';
        return (
          <li
            key={p.neonProjectId}
            className="flex flex-col overflow-hidden rounded-xl border-2 border-zinc-300 bg-white shadow-md"
          >
            <div className="border-b-2 border-zinc-200 bg-gradient-to-r from-teal-600/10 via-teal-50/40 to-zinc-50 px-4 py-3.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3
                    className="text-lg font-bold leading-snug tracking-tight text-zinc-900 sm:text-xl"
                    title={p.name}
                  >
                    {p.name}
                  </h3>
                  <p
                    className="mt-1.5 truncate font-mono text-[11px] text-zinc-500"
                    title={p.neonProjectId}
                  >
                    {p.neonProjectId}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {showProviderBadge ? <ProviderBadge provider="neon" /> : null}
                  {p.regionId ? (
                    <span className="shrink-0 rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 shadow-sm">
                      {p.regionId}
                    </span>
                  ) : null}
                </div>
              </div>
              <p className="mt-2 text-xs text-zinc-600">
                Last snapshot:{' '}
                <span className="font-semibold text-zinc-800">{p.lastSnapshotDate ?? '—'}</span>
              </p>
            </div>

            <div className="flex flex-1 flex-col gap-3 p-4">
              <div className="grid grid-cols-2 gap-3">
                <Stat label="CU-hrs (period)" value={cuTotal} large />
                <Stat label="CU-hrs / day" value={cuDay} />
                <Stat
                  label="Snapshots (rows)"
                  value={u ? String(u.snapshotRows) : usageByProjectId ? '0' : '…'}
                />
                <Stat label="Storage avg (GB)" value={storageAvg} />
                <Stat label="Estimated total $" value={estCost} />
              </div>

              <details className="group rounded-lg border border-zinc-200 bg-zinc-50/80">
                <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-semibold text-zinc-700 marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-2">
                    Other metrics
                    <span className="text-xs font-normal text-zinc-500 group-open:hidden">
                      Show
                    </span>
                    <span className="hidden text-xs font-normal text-zinc-500 group-open:inline">
                      Hide
                    </span>
                  </span>
                </summary>
                <div className="border-t border-zinc-200 px-3 py-3">
                  <dl className="grid gap-3 sm:grid-cols-2">
                    {PROJECT_TABLE_METRICS.map((m) => (
                      <div
                        key={m}
                        className="rounded-md border border-zinc-100 bg-white px-2.5 py-2"
                      >
                        <dt className="text-[11px] font-medium leading-tight text-zinc-500">
                          {NEON_USAGE_METRIC_LABELS[m]}
                        </dt>
                        <dd className="mt-1 font-mono text-sm font-medium text-zinc-900">
                          {u
                            ? formatTotalsIntegerString(u.rawTotals![m])
                            : usageByProjectId
                              ? '0'
                              : '…'}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </details>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

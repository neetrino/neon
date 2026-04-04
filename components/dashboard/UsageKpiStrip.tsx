'use client';

import { useId } from 'react';
import type { DashboardKpiSums } from '@/components/dashboard/usage-kpi-summary';
import { formatCuHours, formatGb, formatUsd } from '@/components/dashboard/usage-kpi-summary';
import { getKpiTooltip } from '@/lib/constants/kpi-tooltips';
import type { CostSummary } from '@/components/dashboard/types';

const NEON_USAGE_DOCS_URL = 'https://neon.tech/docs/introduction/plan-billing';

function formatRangeFooter(fromIso: string, toIso: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };
  const from = new Date(`${fromIso}T12:00:00.000Z`);
  const to = new Date(`${toIso}T12:00:00.000Z`);
  const a = from.toLocaleDateString('en-US', opts);
  const b = to.toLocaleDateString('en-US', opts);
  return a === b ? `Usage on ${a}.` : `Usage for ${a} – ${b}.`;
}

function MetricCell({ label, value, hint }: { label: string; value: string; hint: string }) {
  const tooltipId = useId();
  const infoLabel = `${label}: more information`;

  return (
    <div className="min-w-0 flex-1 px-2 py-2 sm:px-4 sm:py-0">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-zinc-500">{label}</span>
        <span className="group relative inline-flex shrink-0">
          <button
            type="button"
            className="relative inline-flex h-4 w-4 cursor-default items-center justify-center rounded-full border border-zinc-300 text-[10px] font-semibold leading-none text-zinc-500 outline-none transition hover:border-zinc-400 hover:text-zinc-700 focus-visible:ring-2 focus-visible:ring-teal-500/40"
            aria-label={infoLabel}
            aria-describedby={tooltipId}
          >
            <span aria-hidden className="select-none">
              i
            </span>
          </button>
          <span
            id={tooltipId}
            role="tooltip"
            className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg bg-zinc-800 px-3 py-2.5 text-left text-xs font-normal leading-snug text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
          >
            <span
              className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rotate-45 bg-zinc-800"
              aria-hidden
            />
            <span className="relative block whitespace-normal">{hint}</span>
          </span>
        </span>
      </div>
      <p className="mt-1.5 truncate text-lg font-semibold tabular-nums tracking-tight text-zinc-900 sm:text-xl">
        {value}
      </p>
    </div>
  );
}

function CostCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        accent ? 'border-teal-200 bg-teal-50/60' : 'border-zinc-200 bg-white'
      }`}
    >
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="mt-1.5 text-xl font-bold tabular-nums tracking-tight text-zinc-900">{value}</p>
    </div>
  );
}

export function UsageKpiStrip({
  loading,
  fromIso,
  toIso,
  sums,
  kpiScope,
  costSummary,
  providerMode,
}: {
  loading: boolean;
  fromIso: string;
  toIso: string;
  sums: DashboardKpiSums | null;
  kpiScope: 'all' | 'project';
  costSummary: CostSummary | null;
  providerMode: 'neon' | 'vercel' | 'all';
}) {
  const placeholder = loading || sums === null ? '…' : '—';

  if (providerMode === 'all' && costSummary) {
    return (
      <section
        className="rounded-xl border border-zinc-200 bg-white px-4 py-4 shadow-sm sm:px-5 sm:py-5"
        aria-label="Combined cost summary"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <CostCard
            label="Neon estimated cost"
            value={loading ? '…' : formatUsd(costSummary.neonTotalUsd)}
          />
          <CostCard
            label="Vercel charges"
            value={loading ? '…' : formatUsd(costSummary.vercelTotalUsd)}
          />
          <CostCard
            label="Grand total"
            value={loading ? '…' : formatUsd(costSummary.grandTotalUsd)}
            accent
          />
        </div>
        <p className="mt-4 text-xs leading-relaxed text-zinc-500">
          {formatRangeFooter(fromIso, toIso)} Neon cost is estimated; Vercel charges reflect billed
          amounts for the billing period(s) overlapping the selected date range.
        </p>
      </section>
    );
  }

  if (providerMode === 'vercel' && costSummary) {
    return (
      <section
        className="rounded-xl border border-zinc-200 bg-white px-4 py-4 shadow-sm sm:px-5 sm:py-5"
        aria-label="Vercel cost summary"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <CostCard
            label="Plan (Pro)"
            value={loading ? '…' : formatUsd(costSummary.vercelPlanUsd)}
          />
          <CostCard
            label="Bandwidth"
            value={loading ? '…' : formatUsd(costSummary.vercelBandwidthUsd)}
          />
          <CostCard
            label="Functions + Edge"
            value={loading ? '…' : formatUsd(costSummary.vercelFunctionsPlusEdgeUsd)}
          />
          <CostCard label="Builds" value={loading ? '…' : formatUsd(costSummary.vercelBuildUsd)} />
          <CostCard
            label="Total Vercel charges"
            value={loading ? '…' : formatUsd(costSummary.vercelTotalUsd)}
            accent
          />
        </div>
        <p className="mt-4 text-xs leading-relaxed text-zinc-500">
          {formatRangeFooter(fromIso, toIso)} Vercel charges reflect billed amounts for the billing
          period(s) overlapping the selected date range.
        </p>
      </section>
    );
  }

  const compute = sums === null ? placeholder : formatCuHours(sums.computeCuHours);
  const storage = sums === null ? placeholder : formatGb(sums.storageAvgGb);
  const history = sums === null ? placeholder : formatGb(sums.historyAvgGb);
  const network = sums === null ? placeholder : formatGb(sums.networkTotalGb);
  const estimatedCost = sums === null ? placeholder : formatUsd(sums.estimatedTotalUsd);

  return (
    <section
      className="rounded-xl border border-zinc-200 bg-white px-4 py-4 shadow-sm sm:px-5 sm:py-5"
      aria-label="Usage summary"
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:flex sm:divide-x sm:divide-zinc-200">
        <MetricCell label="Compute" value={compute} hint={getKpiTooltip('compute', kpiScope)} />
        <MetricCell
          label="Storage (avg)"
          value={storage}
          hint={getKpiTooltip('storage', kpiScope)}
        />
        <MetricCell
          label="History (avg)"
          value={history}
          hint={getKpiTooltip('history', kpiScope)}
        />
        <MetricCell
          label="Network transfer"
          value={network}
          hint={getKpiTooltip('network', kpiScope)}
        />
        <MetricCell
          label="Estimated cost"
          value={estimatedCost}
          hint="Approximate cost using Neon usage formulas for the selected period."
        />
      </div>
      <p className="mt-4 text-xs leading-relaxed text-zinc-500">
        {formatRangeFooter(fromIso, toIso)} Metrics use Neon billing units (CU-hrs, average GB, GB
        transfer). Estimated cost is approximate and can differ from invoice precision.{' '}
        <a
          href={NEON_USAGE_DOCS_URL}
          className="font-medium text-teal-800 underline decoration-teal-300 underline-offset-2 hover:decoration-teal-600"
          target="_blank"
          rel="noreferrer"
        >
          Learn more
        </a>
        .
      </p>
    </section>
  );
}

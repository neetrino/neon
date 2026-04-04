"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_STROKES } from "@/components/dashboard/chart-colors";
import type { RechartsRow } from "@/components/dashboard/chart-data";
import { formatAbbrev } from "@/components/dashboard/DashboardWidgets";

const CHART_GRID_STROKE = "rgba(24, 24, 27, 0.07)";
const CHART_AXIS_LINE = "rgba(24, 24, 27, 0.12)";
const TICK_FILL = "#71717a";
const LINE_DIM_OPACITY = 0.2;
const LINE_NORMAL_OPACITY = 0.95;
const SIDE_LIST_MAX_HEIGHT = "max-h-[17rem]";

type ProjectStats = {
  totalCostUsd: number;
  computeCuHours: number;
};

type TooltipPayloadItem = {
  dataKey?: string | number;
  value?: string | number;
};

function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

function toNumber(value: string | number | undefined): number {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function UsageTooltipContent({
  active,
  label,
  payload,
  rankedProjectIds,
  projectNames,
  projectStatsById,
}: {
  active?: boolean;
  label?: string | number;
  payload?: TooltipPayloadItem[];
  rankedProjectIds: string[];
  projectNames: Record<string, string>;
  projectStatsById: Record<string, ProjectStats>;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const valueById: Record<string, number> = {};
  for (const item of payload) {
    if (typeof item.dataKey !== "string") {
      continue;
    }
    valueById[item.dataKey] = toNumber(item.value);
  }

  return (
    <div className="w-[20rem] rounded-xl border border-zinc-200 bg-white p-3 text-xs text-zinc-700 shadow-xl">
      <p className="font-semibold text-zinc-900">{label}</p>
      <p className="mt-0.5 text-[11px] text-zinc-500">Projects sorted by estimated cost (desc)</p>
      <ul className={`mt-2 space-y-1 overflow-y-auto pr-1 ${SIDE_LIST_MAX_HEIGHT}`}>
        {rankedProjectIds.map((id, index) => {
          const stats = projectStatsById[id];
          return (
            <li key={id} className="rounded-md border border-zinc-100 bg-zinc-50/70 px-2 py-1.5">
              <div className="truncate font-medium text-zinc-900" title={projectNames[id] ?? id}>
                {index + 1}. {projectNames[id] ?? id}
              </div>
              <div className="font-mono text-[11px] text-zinc-600">
                now {formatAbbrev(valueById[id] ?? 0)} | cost {formatUsd(stats?.totalCostUsd ?? 0)} | cpu{" "}
                {(stats?.computeCuHours ?? 0).toFixed(2)}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function UsageLineChartPanel({
  loading,
  rows,
  projectIds,
  projectNames,
  projectStatsById,
  metricTitle,
}: {
  loading: boolean;
  rows: RechartsRow[];
  projectIds: string[];
  projectNames: Record<string, string>;
  projectStatsById: Record<string, ProjectStats>;
  metricTitle: string;
}) {
  const [activeProjectId, setActiveProjectId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const rankedProjectIds = useMemo(() => {
    return [...projectIds].sort((a, b) => {
      const byCost = (projectStatsById[b]?.totalCostUsd ?? 0) - (projectStatsById[a]?.totalCostUsd ?? 0);
      if (byCost !== 0) {
        return byCost;
      }
      return (projectNames[a] ?? a).localeCompare(projectNames[b] ?? b);
    });
  }, [projectIds, projectNames, projectStatsById]);

  const lineColorById = useMemo(() => {
    const palette: Record<string, string> = {};
    for (const [index, id] of rankedProjectIds.entries()) {
      palette[id] = CHART_STROKES[index % CHART_STROKES.length];
    }
    return palette;
  }, [rankedProjectIds]);

  const focusedProjectId = activeProjectId || selectedProjectId || null;

  return (
    <section className="glass-card flex flex-col gap-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Usage over time</h2>
          <p className="mt-0.5 text-xs text-zinc-500">{metricTitle}</p>
        </div>
        {selectedProjectId ? (
          <button
            type="button"
            onClick={() => setSelectedProjectId("")}
            className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Clear highlight
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-zinc-500">No data in this range.</p>
        ) : (
          <>
            <div className="h-[300px] w-full sm:h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rows} margin={{ top: 12, right: 16, left: 4, bottom: 4 }}>
                  <CartesianGrid stroke={CHART_GRID_STROKE} vertical={false} />
                  <XAxis
                    dataKey="period"
                    tick={{ fill: TICK_FILL, fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: CHART_AXIS_LINE }}
                  />
                  <YAxis
                    tick={{ fill: TICK_FILL, fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => formatAbbrev(Number(v))}
                    width={48}
                  />
                  <Tooltip
                    wrapperStyle={{ pointerEvents: "auto" }}
                    content={
                      <UsageTooltipContent
                        rankedProjectIds={rankedProjectIds}
                        projectNames={projectNames}
                        projectStatsById={projectStatsById}
                      />
                    }
                  />
                  {rankedProjectIds.map((id) => {
                    const isFocused = focusedProjectId === id;
                    const isDimmed = Boolean(focusedProjectId) && !isFocused;
                    return (
                      <Line
                        key={id}
                        type="monotone"
                        dataKey={id}
                        name={projectNames[id] ?? id}
                        stroke={lineColorById[id]}
                        strokeWidth={isFocused ? 3.5 : 2.5}
                        strokeOpacity={isDimmed ? LINE_DIM_OPACITY : LINE_NORMAL_OPACITY}
                        dot={false}
                        activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                        isAnimationActive={false}
                        onMouseEnter={() => setActiveProjectId(id)}
                        onMouseLeave={() => setActiveProjectId("")}
                        onClick={() => setSelectedProjectId((current) => (current === id ? "" : id))}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>

            <aside className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Projects in chart</p>
              <p className="mt-1 text-[11px] text-zinc-500">One sorted list (scroll for more)</p>
              <div className={`mt-2 overflow-y-auto pr-1 ${SIDE_LIST_MAX_HEIGHT}`}>
                <ul className="space-y-1.5">
                  {rankedProjectIds.map((id, index) => {
                    const isFocused = focusedProjectId === id;
                    const isDimmed = Boolean(focusedProjectId) && !isFocused;
                    return (
                      <li key={`all-${id}`}>
                        <button
                          type="button"
                          onClick={() => setSelectedProjectId((current) => (current === id ? "" : id))}
                          onMouseEnter={() => setActiveProjectId(id)}
                          onMouseLeave={() => setActiveProjectId("")}
                          className={`flex w-full items-start justify-between gap-2 rounded-md border px-2 py-1.5 text-left transition ${
                            isFocused
                              ? "border-teal-300 bg-teal-50 text-zinc-900"
                              : "border-zinc-200 bg-zinc-50/60 text-zinc-700 hover:bg-zinc-100"
                          }`}
                          style={{ opacity: isDimmed ? 0.55 : 1 }}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-medium">
                              {index + 1}. {projectNames[id] ?? id}
                            </span>
                            <span className="font-mono text-[11px] text-zinc-500">
                              {formatUsd(projectStatsById[id]?.totalCostUsd ?? 0)} |{" "}
                              {(projectStatsById[id]?.computeCuHours ?? 0).toFixed(2)} CU-hrs
                            </span>
                          </span>
                          <span
                            className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: lineColorById[id] }}
                            aria-hidden
                          />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </aside>
          </>
        )}
      </div>
    </section>
  );
}

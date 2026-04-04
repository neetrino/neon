'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ProjectRow, ProjectUsageAggregate } from '@/components/dashboard/types';
import { ProjectTableCards } from '@/components/dashboard/ProjectTableCards';
import { ProjectTableList } from '@/components/dashboard/ProjectTableList';
import { sortProjectsByEstimatedCost } from '@/components/dashboard/project-table-shared';

const VIEW_STORAGE_KEY = 'neon-dashboard-projects-view';

type ViewMode = 'cards' | 'list';

function readInitialView(): ViewMode {
  if (typeof window === 'undefined') {
    return 'cards';
  }
  return window.localStorage.getItem(VIEW_STORAGE_KEY) === 'list' ? 'list' : 'cards';
}

function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  const base =
    'flex-1 rounded-md px-3 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40';
  return (
    <div
      className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100/90 p-1 shadow-sm"
      role="group"
      aria-label="Project layout"
    >
      <button
        type="button"
        aria-pressed={mode === 'cards'}
        onClick={() => onChange('cards')}
        className={`${base} ${mode === 'cards' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:text-zinc-900'}`}
      >
        Cards
      </button>
      <button
        type="button"
        aria-pressed={mode === 'list'}
        onClick={() => onChange('list')}
        className={`${base} ${mode === 'list' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:text-zinc-900'}`}
      >
        List
      </button>
    </div>
  );
}

export function ProjectTable({
  projects,
  usageByProjectId,
  calendarDays,
  showProviderBadge,
}: {
  projects: ProjectRow[];
  usageByProjectId: Map<string, ProjectUsageAggregate> | null;
  calendarDays: number | null;
  showProviderBadge?: boolean;
}) {
  const [view, setView] = useState<ViewMode>('cards');
  const [hydrated, setHydrated] = useState(false);
  const sortedProjects = useMemo(
    () => sortProjectsByEstimatedCost(projects, usageByProjectId),
    [projects, usageByProjectId],
  );

  useEffect(() => {
    setView(readInitialView());
    setHydrated(true);
  }, []);

  const persistView = (m: ViewMode) => {
    setView(m);
    window.localStorage.setItem(VIEW_STORAGE_KEY, m);
  };

  return (
    <section className="glass-card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-zinc-200 bg-zinc-50/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-zinc-900">Projects</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Totals for the dates selected in the sidebar.
          </p>
        </div>
        {hydrated ? (
          <ViewToggle mode={view} onChange={persistView} />
        ) : (
          <div className="h-10 w-40" aria-hidden />
        )}
      </div>

      <div className="p-4 sm:p-5">
        {sortedProjects.length === 0 ? (
          <p className="text-sm text-zinc-500">No projects yet.</p>
        ) : view === 'cards' ? (
          <ProjectTableCards projects={sortedProjects} usageByProjectId={usageByProjectId} showProviderBadge={showProviderBadge} />
        ) : (
          <ProjectTableList projects={sortedProjects} usageByProjectId={usageByProjectId} showProviderBadge={showProviderBadge} />
        )}
      </div>

      {calendarDays !== null ? (
        <p className="border-t border-zinc-200 bg-zinc-50/30 px-4 py-2.5 text-xs text-zinc-500 sm:px-5">
          Averages use <span className="font-semibold text-zinc-700">{calendarDays}</span> calendar
          days in range.
        </p>
      ) : null}
    </section>
  );
}

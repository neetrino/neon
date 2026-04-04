import type { ProjectRow } from "@/components/dashboard/types";

export function ProjectTable({ projects }: { projects: ProjectRow[] }) {
  return (
    <section className="glass-card overflow-hidden">
      <div className="border-b border-white/10 px-5 py-4">
        <h2 className="text-lg font-medium text-zinc-100">Projects</h2>
        <p className="text-sm text-zinc-500">Names from Neon; last stored snapshot date.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-zinc-900/60 text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Project ID</th>
              <th className="px-5 py-3 font-medium">Region</th>
              <th className="px-5 py-3 font-medium">Last snapshot</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-zinc-300">
            {projects.map((p) => (
              <tr key={p.neonProjectId} className="hover:bg-zinc-800/40">
                <td className="px-5 py-3 font-medium text-zinc-100">{p.name}</td>
                <td className="px-5 py-3 font-mono text-xs text-zinc-500">{p.neonProjectId}</td>
                <td className="px-5 py-3 text-zinc-500">{p.regionId ?? "—"}</td>
                <td className="px-5 py-3 text-zinc-400">{p.lastSnapshotDate ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

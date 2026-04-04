const MANUALLY_IGNORED_PROJECT_IDS = [
  'red-violet-56414917',
  'mute-mode-52233375',
  'frosty-waterfall-89740024',
  'broad-block-37553355',
] as const;

const ignoredProjectIdSet = new Set<string>(MANUALLY_IGNORED_PROJECT_IDS);

export function isIgnoredProjectId(projectId: string): boolean {
  return ignoredProjectIdSet.has(projectId);
}

export function filterIgnoredProjectIds<T extends { neonProjectId: string }>(projects: T[]): T[] {
  return projects.filter((project) => !isIgnoredProjectId(project.neonProjectId));
}

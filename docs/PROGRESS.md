# Development progress — Neon usage dashboard

**Project.** Neon usage analytics dashboard  
**Phase.** 2 — v1+ features and quality hardening  
**Overall progress.** ~55% (MVP shipped; stage-2 scope in progress)  
**Last updated.** 2026-04-04

---

## Phase overview

| Phase                | Status      | Notes                                                       |
| -------------------- | ----------- | ----------------------------------------------------------- |
| 1 — Foundation / MVP | Done        | DB, cron sync, dashboard, usage API, scripts, optional auth |
| 2 — v1+ (current)    | In progress | CSV export, alerts, UX, tests, automation                   |
| 3 — v2               | Planned     | UI backfill polish, theme, integrations                     |

---

## Done (phase 1)

- [x] Prisma schema, migrations, idempotent `usage_snapshots`
- [x] Neon API client, daily sync, retry/backoff
- [x] Vercel cron route (secured), `vercel.json` schedule
- [x] Dashboard UI (charts, KPIs, project tables, filters)
- [x] Read-only `/api/usage/*` routes with validation
- [x] Optional password gate + session (env-driven)
- [x] Scripts: `usage:backfill`, `usage:reconcile`
- [x] Docs: `TECH_CARD`, `01-ARCHITECTURE`, `project.md`

---

## In progress (phase 2)

- [ ] CSV export for selected period (per `docs/project.md` §6)
- [ ] Alerts after N failed sync days (per §7; out of scope for v1 in TECH_CARD — confirm product priority)
- [ ] Expand unit/integration tests for sync and API boundaries
- [x] Lint + Prettier + Vitest + Husky + GitHub Actions CI

**Blockers.** None technical; alert channel credentials and product priority TBD.

---

## Next tasks (priority)

1. Implement CSV export (server route + client trigger; rate-limit / size limits).
2. Add integration tests for cron handler with mocked Neon API (where valuable).
3. Decide on alert delivery (email vs Slack) and env vars; optional cron check.

---

## Metrics (approximate)

| Metric     | Value                                   |
| ---------- | --------------------------------------- |
| Test files | 2+ (`*.test.ts`)                        |
| CI         | `pnpm lint` + `pnpm test:ci` on push/PR |

---

## References

- Spec: `docs/project.md`
- Stack: `docs/TECH_CARD.md`
- Architecture: `docs/01-ARCHITECTURE.md`
- Quality: `docs/QUALITY_AUTOMATION_PLAN.md`

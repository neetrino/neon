# Architecture — Neon usage dashboard

**Size.** A · **Updated.** 2026-04-04

## Purpose

Collect **daily** Neon organization consumption metrics per project via the official **Neon API** (`/consumption_history/v2/projects`), persist them in **Postgres (Neon)**, and visualize usage on a **Next.js** dashboard deployed on **Vercel**. A **Vercel Cron** job calls a secured route once per day to sync **yesterday (UTC)**.

## High level

```
Vercel Cron  ──GET + CRON_SECRET──▶  /api/cron/sync-neon-usage
                                         │
Neon Console API ◀── Bearer NEON_API_KEY ─┤
                                         │
                                         ▼
                                   Postgres (Neon)
                                         ▲
Browser  ────────────────────────────────┘
           / (dashboard)   /api/usage/*
```

## Layout (size A)

| Path | Role |
|------|------|
| `app/` | Routes, API handlers, global styles |
| `components/dashboard/` | Dashboard UI |
| `lib/` | Env, DB, Neon client, sync, auth helpers |
| `prisma/` | Schema and migrations |

## Security

- `NEON_API_KEY`, `CRON_SECRET`, `DATABASE_URL` — server-only (Vercel env).
- Cron: `Authorization: Bearer <CRON_SECRET>` (Vercel injects when configured).
- Optional UI gate: `DASHBOARD_PASSWORD` + `JWT_SECRET` (HTTP-only session cookie; middleware + Edge-safe JWT verify).

## Idempotency

`usage_snapshots` uses `@@unique([neonProjectId, snapshotDate])` with Prisma `upsert` so repeated cron runs for the same UTC day do not duplicate rows.

## Related docs

- Spec: `docs/project.md`
- Stack: `docs/TECH_CARD.md`

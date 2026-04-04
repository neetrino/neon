# Technical card — Neon usage dashboard

**Project.** Neon usage analytics dashboard  
**Size.** A (small)  
**Date.** 2026-04-04  
**Status.** Phase 1 (MVP) delivered; phase 2 (v1+ / polish / export / alerts) in progress — see `docs/PROGRESS.md`

---

## Stack (decisions)

| Area        | Choice                  |
| ----------- | ----------------------- |
| Package mgr | pnpm                    |
| Runtime     | Node.js 20.9+           |
| Framework   | Next.js 15 (App Router) |
| Language    | TypeScript (strict)     |
| Styling     | Tailwind CSS 4          |
| Charts      | Recharts                |
| Database    | PostgreSQL (Neon)       |
| ORM         | Prisma 6                |
| Validation  | Zod                     |
| Hosting     | Vercel (+ Vercel Cron)  |
| Logging     | pino                    |

## Out of scope (v1)

- Clerk / OAuth (optional password gate via env)
- Redis / R2
- Email alerts for failed sync

## References

- Product spec: `docs/project.md`
- Architecture: `docs/01-ARCHITECTURE.md`

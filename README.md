# Զարգացման կանոնների կաղապար (Cursor AI)

Cursor-ում AI-զարգացման կանոններով repo-ի կաղապար։ Next.js / NestJS, ճարտարապետություն, կոդ, անվտանգություն, թեստեր, դեպլոյ։

---

## Ինչպես սկսել

1. **Repo** — GitHub → Use this template → clone, բացի՛ր պրոյեկտի թղթապանակը Cursor-ում։
2. **BRIEF** — լրացրու՛ `docs/BRIEF.md` (նկարագրություն, ֆունկցիաներ, ինտեգրացիաներ)։
3. **AI** — chat-ում. «Կարդա՛ docs/BRIEF.md, սկսի՛ր ըստ 21-project-onboarding.mdc. Փուլ 1 — չափը, Փուլ 2 — TECH_CARD. Սպասում եմ հաստատում կոդից առաջ»։
4. **Հաստատում** — TECH_CARD և ճարտարապետությունը հաստատի՛ր, ապա env։

---

## Մշակողի դերը

- **Կոդից առաջ:** BRIEF, TECH_CARD, ճարտարապետություն — AI-ն առաջարկում է, դու հաստատում ես։
- **Տվյալներ (AI-ն կխնդրի ըստ need-ի):** Neon (DATABASE_URL), R2 (bucket + բանալիներ), Vercel (env), Auth (OAuth), Resend/Stripe/Դոմեն — անհրաժեշտության դեպքում։
- **Env:** Ստեղծել `.env` + `.env.example` (առանց գաղտնիքների), `.gitignore`-ում — `.env`, `.env.local`. 
Հերթականություն. 
Neon → `.env`
R2 →  `.env`
Resend / Upstash (եթե պետք է) → `.env`. Գաղտնիքները միայն env-ում, `.env` — չի commit-վում։
- **Ընթացքում:** Պատասխանի՛ր AI-ի հարցերին, ստուգի՛ր PROGRESS.md, թեստավորի՛ր փուլերը։
- **Ավարտին:** TECH_CARD ✅, PROGRESS 100%, դեպլոյ + .env.example փաստաթղթավորված։

---

## Neon usage dashboard (this repo app)

Next.js app at repo root: daily Neon consumption sync → Postgres → charts.

1. Copy `.env.example` → `.env` and set `DATABASE_URL`, `NEON_API_KEY`, `NEON_ORG_ID`, `CRON_SECRET` (and optional `DASHBOARD_PASSWORD` + `JWT_SECRET`). You can set `NEON_PRICING_PLAN` (`launch` or `scale`) for estimated-cost formulas.
2. `pnpm install` · `pnpm exec prisma migrate deploy` (or `pnpm db:push` for dev) · `pnpm dev`
3. Trigger sync manually: `curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/sync-neon-usage"`
4. Reconcile Neon API vs DB snapshots for a period: `pnpm usage:reconcile -- --from=YYYY-MM-DD --to=YYYY-MM-DD`
5. Deploy to Vercel; add the same env vars. Cron is defined in `vercel.json` (02:00 UTC).

Spec: `docs/project.md` · Stack: `docs/TECH_CARD.md` · Architecture: `docs/01-ARCHITECTURE.md`

---

## Նախագծերի չափեր

| Չափ | Նկարագրություն | Կառուցվածք |
|-----|-----------------|------------|
| **A** | 1–3 ամիս, 5–15 ֆիչ | `src/app`, `components`, `lib` |
| **B** | 3–6 ամիս, 15–50 ֆիչ | `src/features/*`, `shared/*` |
| **C** | 6+ ամիս, 50+ ֆիչ | Monorepo `apps/*`, `packages/*` |

**Տեղեկատուներ.** `docs/reference/platforms/`, `docs/reference/knowledge-base/`, `docs/reference/templates/` — Vercel, Neon, R2, Render, փաստաթղթերի կաղապարներ։

---

## Կանոնների թարմացում

Template-ի կանոնները թարմացվում են։ Գոյություն ունեցող նախագծում. ավելացրու՛ կաղապարը remote, fetch արա՛, ապա merge/checkout արա՛ անհրաժեշտ `.cursor/rules/*.mdc` ֆայլերը (մանրամասներ — Git-ի remote/fetch/checkout ուղեցույցներ)։

---

## Quality Automation

Պրոյեկտ ստեղծելուց հետո. AI-ն (onboarding 3.1.1) — prettier, vitest, husky, commitlint, CI workflow. Մշակողը. Branch Protection (`main`), Secret Protection, Dependabot npm։ Մանրամասներ — `docs/QUALITY_AUTOMATION_PLAN.md`։

---

[MIT](LICENSE) — ազատ օգտագործում և հարմարեցում։

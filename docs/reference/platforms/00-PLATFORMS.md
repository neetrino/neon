# Պլատֆորմների կարգավորում Production-ի համար

> Ամբողջական ուղեցույց բոլոր պլատֆորմների և սերվիսների կարգավորման համար նախագիծը production-ում գործարկելու համար։

**Վերջին թարմացում.** 2026-02-12

---

## 📋 ՊԼԱՏՖՈՐՄՆԵՐԻ ՑԱՆԿ

### Frontend Hosting

| Պլատֆորմ   | Ֆայլ                           | Երբ օգտագործել                         |
| ---------- | ------------------------------ | -------------------------------------- |
| **Vercel** | [01-VERCEL.md](./01-VERCEL.md) | Next.js նախագծեր, հիմնական ընտրություն |

### Backend Hosting

| Պլատֆորմ    | Ֆայլ                             | Երբ օգտագործել            |
| ----------- | -------------------------------- | ------------------------- |
| **Railway** | [04-RAILWAY.md](./04-RAILWAY.md) | Պարզ backend, լավ DX      |
| **Render**  | [05-RENDER.md](./05-RENDER.md)   | Կա անվճար tier            |
| **Fly.io**  | [06-FLYIO.md](./06-FLYIO.md)     | Global edge, ցածր latency |

### Database

| Պլատֆորմ | Ֆայլ                       | Երբ օգտագործել                            |
| -------- | -------------------------- | ----------------------------------------- |
| **Neon** | [02-NEON.md](./02-NEON.md) | Serverless Postgres, հիմնական ընտրություն |

### CDN և Storage

| Պլատֆորմ       | Ֆայլ                                   | Երբ օգտագործել            |
| -------------- | -------------------------------------- | ------------------------- |
| **Cloudflare** | [03-CLOUDFLARE.md](./03-CLOUDFLARE.md) | CDN, R2 storage, WAF, DNS |

### Cache և Հերթեր

| Պլատֆորմ    | Ֆայլ                             | Երբ օգտագործել                         |
| ----------- | -------------------------------- | -------------------------------------- |
| **Upstash** | [09-UPSTASH.md](./09-UPSTASH.md) | Redis serverless, rate limiting, cache |

### Ինքնություն հաստատում

| Պլատֆորմ             | Ֆայլ                       | Երբ օգտագործել                   |
| -------------------- | -------------------------- | -------------------------------- |
| **Clerk / NextAuth** | [10-AUTH.md](./10-AUTH.md) | Օգտատերերի ինքնություն հաստատում |

### Email

| Պլատֆորմ   | Ֆայլ                         | Երբ օգտագործել       |
| ---------- | ---------------------------- | -------------------- |
| **Resend** | [11-EMAIL.md](./11-EMAIL.md) | Թրանզակցիոն նամակներ |

### DevOps և Մոնիտորինգ

| Պլատֆորմ   | Ֆայլ                           | Երբ օգտագործել               |
| ---------- | ------------------------------ | ---------------------------- |
| **GitHub** | [07-GITHUB.md](./07-GITHUB.md) | CI/CD, Secrets, Environments |
| **Sentry** | [08-SENTRY.md](./08-SENTRY.md) | Error tracking, monitoring   |

---

## 🎯 ՏԻՊԻԿ ԿԱՐԳԱՎՈՐՈՒՄՆԵՐ

### Փոքր նախագիծ (A)

```
Frontend:  Vercel
Database:  Neon (Free tier)
Auth:      Clerk կամ NextAuth
Storage:   Vercel Blob
CI/CD:     Vercel (ներկառուցված)
```

### Միջին նախագիծ (B)

```
Frontend:  Vercel
Backend:   Railway կամ Vercel (API Routes)
Database:  Neon (Pro)
Cache:     Upstash Redis
Auth:      Clerk
Email:     Resend
Storage:   Cloudflare R2
CDN:       Cloudflare
CI/CD:     GitHub Actions + Vercel
Monitoring: Sentry
```

### Մեծ նախագիծ (C)

```
Frontend:  Vercel (Pro)
Backend:   Railway / Fly.io
Database:  Neon (Scale)
Cache:     Upstash Redis
Auth:      Clerk (Pro)
Email:     Resend
Storage:   Cloudflare R2
CDN:       Cloudflare (Pro)
CI/CD:     GitHub Actions
Monitoring: Sentry + Vercel Analytics
```

---

## ✅ ԸՆԴՀԱՆՈՒՐ ԿԱՐԳԱՎՈՐՄԱՆ CHECKLIST

### Նախագիծը գործարկելուց առաջ

- [ ] **Հաշիվներ ստեղծված.**
  - [ ] Vercel
  - [ ] Neon
  - [ ] Clerk / NextAuth կարգավորված
  - [ ] Upstash (եթե cache/rate limiting է պետք)
  - [ ] Resend (եթե email է պետք)
  - [ ] Cloudflare (եթե CDN է պետք)
  - [ ] Railway/Render/Fly.io (եթե backend)
  - [ ] Sentry (եթե պետք է)

- [ ] **GitHub կարգավորված.**
  - [ ] Repository ստեղծված
  - [ ] Secrets ավելացված
  - [ ] Environments կարգավորված

### Դեպլոյի ժամանակ

- [ ] **Vercel.**
  - [ ] Նախագիծը միացված է GitHub-ին
  - [ ] Environment Variables կարգավորված
  - [ ] Domain կարգավորված

- [ ] **Neon.**
  - [ ] Database ստեղծված
  - [ ] Production branch ստեղծված
  - [ ] Connection string-ը Vercel/Railway-ում

- [ ] **Cloudflare (եթե օգտագործվում է).**
  - [ ] DNS գրառումներ կարգավորված
  - [ ] SSL/TLS mode. Full (strict)
  - [ ] WAF rules կարգավորված

### Դեպլոյից հետո

- [ ] **Մոնիտորինգ.**
  - [ ] Sentry միացված
  - [ ] Analytics աշխատում է
  - [ ] Alerts կարգավորված

---

## 🔐 ԱՆՎՏԱՆԳՈՒԹՅՈՒՆ

### Secrets Management

```markdown
## Որտեղ պահել գաղտնիքները

| Գաղտնիք         | Որտեղ պահել                          |
| --------------- | ------------------------------------ |
| DATABASE_URL    | Vercel/Railway Environment Variables |
| API Keys        | Vercel/Railway Environment Variables |
| JWT_SECRET      | Vercel/Railway Environment Variables |
| Webhook secrets | Platform-specific                    |

## ԵՐԵՔԵԼԵՎ

- ❌ Կոդում
- ❌ .env-ում git-ում
- ❌ Հրապարակային լոգերում
- ❌ GitHub Issues/PR-ում
```

### Environment Separation

```markdown
## Environments

| Environment | Օգտագործում       | Database            |
| ----------- | ----------------- | ------------------- |
| Development | Տեղական զարգացում | Neon dev branch     |
| Preview     | PR previews       | Neon preview branch |
| Staging     | Թեստավորում       | Neon staging branch |
| Production  | Արտադրական սերվեր | Neon main branch    |
```

---

## 📖 ԿԱՐԳԱՎՈՐՄԱՆ ԿԱՐԳ

### Նոր նախագծի համար.

```
1. GitHub     → Ստեղծել repo, կարգավորել secrets
2. Neon       → Ստեղծել database
3. Clerk      → Կարգավորել ինքնություն հաստատում
4. Vercel     → Միացնել repo, կարգավորել env vars
5. Upstash    → Redis cache/rate limiting-ի համար (ընտրովի)
6. Resend     → Email (ընտրովի)
7. Cloudflare → DNS, CDN (ընտրովի)
8. Railway    → Backend (եթե պետք է)
9. Sentry     → Մոնիտորինգ (ընտրովի)
```

---

## 📁 ԱՅՍ ԹՂԹԱՊԱՆԱԿԻ ՖԱՅԼԵՐԸ

```
Platforms/
├── 00-PLATFORMS.md      # ← Այս ֆայլը (բովանդակություն)
├── 01-VERCEL.md         # Vercel կարգավորում
├── 02-NEON.md           # Neon Database կարգավորում
├── 03-CLOUDFLARE.md     # Cloudflare կարգավորում
├── 04-RAILWAY.md        # Railway կարգավորում
├── 05-RENDER.md         # Render կարգավորում
├── 06-FLYIO.md          # Fly.io կարգավորում
├── 07-GITHUB.md         # GitHub Actions, Secrets
├── 08-SENTRY.md         # Sentry մոնիտորինգ
├── 09-UPSTASH.md        # Redis serverless (cache, հերթեր)
├── 10-AUTH.md           # Ինքնություն հաստատում (Clerk, NextAuth)
└── 11-EMAIL.md          # Թրանզակցիոն email (Resend)
```

---

**Տարբերակ.** 1.1

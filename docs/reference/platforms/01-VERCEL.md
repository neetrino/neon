# Vercel — Ամբողջական կարգավորում

> Vercel — frontend (Next.js) և serverless ֆունկցիաների դեպլոյի պլատֆորմ։

---

## 📋 ԲՈՎԱՆԴԱԿՈՒԹՅՈՒՆ

1. [Հաշվի ստեղծում](#ստեղծում-ակաունտ)
2. [Նախագծի միացում](#նախագծի-միացում)
3. [Environment Variables](#environment-variables)
4. [Domains](#domains)
5. [Vercel Blob Storage](#vercel-blob-storage)
6. [Vercel KV (Redis)](#vercel-kv-redis)
7. [Vercel Postgres](#vercel-postgres)
8. [Edge Config](#edge-config)
9. [Web Application Firewall (WAF)](#waf)
10. [Analytics & Speed Insights](#analytics)
11. [Integrations](#integrations)
12. [Team & Collaboration](#team)
13. [Checklist](#checklist)

---

## 1. Հաշվի ստեղծում {#ստեղծում-ակաունտ}

### Քայլեր.

1. Անցի՛ր [vercel.com](https://vercel.com)
2. "Sign Up" → "Continue with GitHub"
3. Ինքնորոշել Vercel-ը GitHub-ում
4. Ընտրի՛ր պլան.
   - **Hobby** — անվճար, անձնական նախագծերի համար
   - **Pro** — $20/ամիս, կոմերցիալ նախագծերի համար
   - **Enterprise** — մեծ թիմերի համար

### Գրանցումից հետո.

- Հաստատի՛ր email
- Կարգավորի՛ր պրոֆիլ
- Միացրու՛ GitHub organization (անհրաժեշտության դեպքում)

---

## 2. Նախագծի միացում {#նախագծի-միացում}

### Եղանակ 1. UI-ով

1. Dashboard → "Add New Project"
2. "Import Git Repository"
3. Ընտրի՛ր repository
4. Կարգավորի՛ր.
   - **Framework Preset.** Next.js (ավտոորոշում)
   - **Root Directory.** `.` կամ `apps/web` (monorepo-ի համար)
   - **Build Command.** `npm run build` (կամ ավտո)
   - **Output Directory.** `.next` (ավտո)
   - **Install Command.** `npm install` (կամ `pnpm install`)

### Եղանակ 2. CLI-ով

```bash
# CLI-ի տեղադրում
npm i -g vercel

# Մուտք
vercel login

# Նախագծի միացում
cd your-project
vercel link

# Դեպլոյ
vercel          # preview
vercel --prod   # production
```

### Նախագծի կարգավորում (vercel.json)

```json
{
  "framework": "nextjs",
  "regions": ["iad1"],
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "no-store" }]
    }
  ],
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://api.example.com/:path*"
    }
  ]
}
```

---

## 3. Environment Variables {#environment-variables}

### UI-ով.

1. Project → Settings → Environment Variables
2. Add New.
   - **Key.** `DATABASE_URL`
   - **Value.** `postgresql://...`
   - **Environment.** Production, Preview, Development

### Փոփոխականների տիպեր.

| Տիպ       | Նկարագրություն       | Օրինակ                |
| --------- | -------------------- | --------------------- |
| Plaintext | Սովորական տեքստ      | API_URL               |
| Secret    | Գաղտնագրված          | DATABASE_URL, API_KEY |
| Reference | Հղում այլ փոփոխականի | $DATABASE_URL         |

### Environments.

| Environment | Երբ է օգտագործվում              |
| ----------- | ------------------------------- |
| Production  | main branch → production URL    |
| Preview     | PR և այլ branches → preview URL |
| Development | `vercel dev` տեղական            |

### Պարտադիր փոփոխականներ.

```bash
# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...      # Առանց pooling միգրացիաների համար

# Auth
NEXTAUTH_SECRET=your-secret-32-chars-min
NEXTAUTH_URL=https://your-domain.com

# Հրապարակային (հասանելի բրաուզերում)
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### CLI-ով.

```bash
# Փոփոխական ավելացնել
vercel env add DATABASE_URL production

# Փոփոխականներ դիտել
vercel env ls

# Ներբեռնել .env.local
vercel env pull
```

---

## 4. Domains {#domains}

### Դոմեն ավելացնել.

1. Project → Settings → Domains
2. "Add Domain"
3. Մուտքագրի՛ր դոմեն. `example.com`
4. Կարգավորի՛ր DNS (տե՛ս ստորև)

### DNS կարգավորում.

#### Apex domain (example.com)-ի համար.

```
Type: A
Name: @
Value: 76.76.21.21
```

#### www-ի համար.

```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

#### Subdomain (app.example.com)-ի համար.

```
Type: CNAME
Name: app
Value: cname.vercel-dns.com
```

### SSL/HTTPS.

- Ավտոմատ Let's Encrypt-ով
- HTTPS-ի հարկադրումը լռելյայն միացված է

### Redirects.

```json
// vercel.json
{
  "redirects": [
    {
      "source": "/old-page",
      "destination": "/new-page",
      "permanent": true
    },
    {
      "source": "/(.*)",
      "has": [{ "type": "host", "value": "www.example.com" }],
      "destination": "https://example.com/$1",
      "permanent": true
    }
  ]
}
```

---

## 5. Vercel Blob Storage {#vercel-blob-storage}

> S3-համատեղելի պահոց ֆայլերի համար։

### Միացում.

1. Project → Storage → Create Database
2. Ընտրի՛ր "Blob"
3. Ստեղծի՛ր store

### Տեղադրում.

```bash
npm install @vercel/blob
```

### Օգտագործում.

```typescript
// lib/blob.ts
import { put, del, list } from '@vercel/blob';

// Ֆայլի բեռնում
export async function uploadFile(file: File) {
  const blob = await put(file.name, file, {
    access: 'public',
    addRandomSuffix: true,
  });
  return blob.url;
}

// Ֆայլի ջնջում
export async function deleteFile(url: string) {
  await del(url);
}

// Ֆայլերի ցանկ
export async function listFiles(prefix?: string) {
  const { blobs } = await list({ prefix });
  return blobs;
}
```

### API Route բեռնման համար.

```typescript
// app/api/upload/route.ts
import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: 'No file' }, { status: 400 });
  }

  const blob = await put(file.name, file, {
    access: 'public',
  });

  return NextResponse.json(blob);
}
```

### Սահմանափակումներ.

| Պլան  | Ֆայլի չափ | Պահոց  |
| ----- | --------- | ------ |
| Hobby | 4.5 MB    | 1 GB   |
| Pro   | 500 MB    | 100 GB |

---

## 6. Vercel KV (Redis) {#vercel-kv-redis}

> Serverless Redis cache-ի և սեսիաների համար։

### Միացում.

1. Project → Storage → Create Database
2. Ընտրի՛ր "KV"
3. Ստեղծի՛ր store

### Տեղադրում.

```bash
npm install @vercel/kv
```

### Օգտագործում.

```typescript
// lib/kv.ts
import { kv } from '@vercel/kv';

// Cache
export async function getFromCache<T>(key: string): Promise<T | null> {
  return await kv.get<T>(key);
}

export async function setCache<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  await kv.set(key, value, { ex: ttlSeconds });
}

// Rate limiting
export async function checkRateLimit(ip: string, limit: number): Promise<boolean> {
  const key = `rate-limit:${ip}`;
  const current = await kv.incr(key);

  if (current === 1) {
    await kv.expire(key, 60); // 1 րոպե պատուհան
  }

  return current <= limit;
}
```

---

## 7. Vercel Postgres {#vercel-postgres}

> Neon-ի այլընտրանք, ինտեգրված Vercel-ում։

### Միացում.

1. Project → Storage → Create Database
2. Ընտրի՛ր "Postgres"
3. Ընտրի՛ր region (մոտ ֆունկցիաներին)

### Prisma-ով օգտագործում.

```prisma
// schema.prisma
datasource db {
  provider = "postgresql"
  url = env("POSTGRES_PRISMA_URL")
  directUrl = env("POSTGRES_URL_NON_POOLING")
}
```

### Environment Variables (ավտոմատ).

```bash
POSTGRES_URL=postgres://...
POSTGRES_PRISMA_URL=postgres://...?pgbouncer=true
POSTGRES_URL_NON_POOLING=postgres://...
```

---

## 8. Edge Config {#edge-config}

> Գլոբալ key-value store կոնֆիգուրացիայի համար (feature flags և այլն)։

### Միացում.

1. Project → Storage → Create
2. Ընտրի՛ր "Edge Config"

### Օգտագործում.

```typescript
import { get } from '@vercel/edge-config';

// Edge Runtime-ում
export async function getFeatureFlag(flag: string): Promise<boolean> {
  const value = await get<boolean>(flag);
  return value ?? false;
}

// Օգտագործում
const isNewCheckoutEnabled = await getFeatureFlag('new-checkout');
```

---

## 9. Web Application Firewall (WAF) {#waf}

> Պաշտպանություն հարձակումներից։ Հասանելի Pro-ում և բարձր։

### Կարգավորում.

1. Project → Security → Firewall
2. Enable Firewall

### Ներկառուցված rules.

- SQL Injection protection
- XSS protection
- Path traversal protection
- Rate limiting

### Custom Rules.

```json
// Dashboard կամ API-ով
{
  "action": "block",
  "conditions": {
    "ip": ["1.2.3.4", "5.6.7.8"],
    "path": "/admin/*"
  }
}
```

### Rate Limiting.

1. Project → Security → Rate Limiting
2. Add Rule.
   - Path: `/api/*`
   - Limit: 100 requests per minute
   - Action: Block

---

## 10. Analytics & Speed Insights {#analytics}

### Vercel Analytics.

1. Project → Analytics → Enable

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### Speed Insights.

```typescript
// app/layout.tsx
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
```

---

## 11. Integrations {#integrations}

### Neon Integration.

1. Project → Settings → Integrations
2. "Browse Marketplace" → Neon
3. Connect → ինքնորոշել
4. Environment variables ավելացվում են ավտոմատ
5. Preview branches-ը ստանում են իրենց database branches-ը

### Sentry Integration.

1. Integrations → Sentry
2. Connect Sentry account
3. Ընտրի՛ր Sentry project
4. Source maps-ի ավտոմատ ներբեռնում

### Այլ օգտակար ինտեգրացիաներ.

- **Checkly** — մոնիտորինգ և synthetic tests
- **LogRocket** — session replay
- **Split** — feature flags
- **PlanetScale** — MySQL database

---

## 12. Team & Collaboration {#team}

### Team ստեղծում.

1. Dashboard → Settings → Teams
2. "Create Team"
3. Հրավիրի՛ր մասնակիցներ

### Դերեր.

| Դեր       | Իրավունքներ                   |
| --------- | ----------------------------- |
| Owner     | Ամբողջական մուտք, billing     |
| Member    | Դեպլոյ, նախագծերի կարգավորում |
| Developer | Միայն դեպլոյ                  |
| Viewer    | Միայն դիտում                  |

### Git Integration.

- PR previews ավտոմատ
- Մեկնաբանություններ PR-ում preview URL-ով
- Դեպլոյի ստատուսի ստուգումներ

---

## ✅ Checklist {#checklist}

### Նախնական կարգավորում.

- [ ] Հաշիվ ստեղծված
- [ ] GitHub միացված
- [ ] Նախագիծը import արված
- [ ] Framework preset ընտրված (Next.js)

### Environment Variables.

- [ ] DATABASE_URL կարգավորված
- [ ] NEXTAUTH_SECRET կարգավորված
- [ ] NEXTAUTH_URL կարգավորված
- [ ] Հրապարակային փոփոխականներ (NEXT*PUBLIC*\*) կարգավորված
- [ ] Preview և Production բաժանված

### Domains.

- [ ] Դոմեն ավելացված
- [ ] DNS կարգավորված
- [ ] SSL-ը աշխատում է
- [ ] www redirect կարգավորված (անհրաժեշտության դեպքում)

### Storage (անհրաժեշտության դեպքում).

- [ ] Blob ֆայլերի համար
- [ ] KV cache-ի համար
- [ ] Postgres կամ Neon integration

### Security.

- [ ] WAF միացված (Pro)
- [ ] Rate limiting կարգավորված
- [ ] Զգայուն env vars նշված որպես Secret

### Monitoring.

- [ ] Analytics միացված
- [ ] Speed Insights միացված
- [ ] Sentry միացված (ընտրովի)

### Performance.

- [ ] Region ընտրված (մոտ օգտատերերին/DB-ին)
- [ ] Edge functions որտեղ պետք է
- [ ] Caching headers կարգավորված

---

**Տարբերակ.** 1.0

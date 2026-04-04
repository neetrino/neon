# Cloudflare — Ամբողջական կարգավորում

> Cloudflare — CDN, DNS, WAF, R2 Storage և DDoS-ից պաշտպանություն։

---

## 📋 ԲՈՎԱՆԴԱԿՈՒԹՅՈՒՆ

1. [Հաշվի ստեղծում](#ստեղծում-ակաունտ)
2. [Դոմենի ավելացում](#domain-add)
3. [DNS կարգավորում](#dns)
4. [SSL/TLS](#ssl-tls)
5. [CDN & Caching](#cdn-caching)
6. [R2 Storage](#r2-storage)
7. [WAF (Web Application Firewall)](#waf)
8. [DDoS Protection](#ddos)
9. [Page Rules](#page-rules)
10. [Workers](#workers)
11. [Analytics](#analytics)
12. [Checklist](#checklist)

---

## 1. Հաշվի ստեղծում {#ստեղծում-ակաունտ}

### Քայլեր.

1. Անցի՛ր [cloudflare.com](https://cloudflare.com)
2. "Sign Up"
3. Հաստատի՛ր email
4. Ընտրի՛ր պլան.
   - **Free** — հիմնական CDN, DNS, DDoS protection
   - **Pro** — $20/ամիս, WAF, Image Optimization
   - **Business** — $200/ամիս, advanced WAF, 24/7 support

### Free-ում ներառված.

- DNS hosting
- CDN (200+ data centers)
- DDoS protection (Layer 3/4)
- Universal SSL
- Page Rules (3)
- Analytics (հիմնական)

---

## 2. Դոմենի ավելացում {#domain-add}

### Քայլեր.

1. Dashboard → "Add a Site"
2. Մուտքագրի՛ր դոմեն. `example.com`
3. Ընտրի՛ր պլան (Free)
4. Cloudflare-ը սկանավորում է առկա DNS գրառումները
5. Ստուգի՛ր և հաստատի՛ր գրառումները
6. Ստացի՛ր Cloudflare nameservers.
   ```
   ada.ns.cloudflare.com
   bob.ns.cloudflare.com
   ```
7. Փոխի՛ր nameservers-ը դոմենի ռեգիստրատորում

### Սպասում.

- DNS propagation. մինչև 24 ժամ (սովորաբար 1-2 ժամ)
- Ստատուսը կփոխվի "Active"

---

## 3. DNS կարգավորում {#dns}

### DNS պանել.

1. Domain → DNS → Records

### Գրառումների տիպեր.

| Տիպ   | Նշանակություն | Օրինակ                     |
| ----- | ------------- | -------------------------- |
| A     | IPv4 հասցե    | @ → 76.76.21.21 (Vercel)   |
| AAAA  | IPv6 հասցե    | @ → 2606:...               |
| CNAME | Alias         | www → cname.vercel-dns.com |
| MX    | Email         | @ → mail.provider.com      |
| TXT   | Verification  | @ → "v=spf1 ..."           |

### Vercel-ի համար.

```
# Apex domain (example.com)
Type: A
Name: @
Content: 76.76.21.21
Proxy: ON (նարնջագույն ամպ)

# WWW subdomain
Type: CNAME
Name: www
Content: cname.vercel-dns.com
Proxy: ON

# API subdomain (եթե առանձին backend)
Type: CNAME
Name: api
Content: your-api.railway.app
Proxy: OFF (մոխրագույն ամպ) կամ ON
```

### Proxy Status.

| Ստատուս     | Արժեք                                |
| ----------- | ------------------------------------ |
| 🟠 Proxied  | Տրաֆիկ Cloudflare-ով (CDN, WAF)      |
| ⚪ DNS only | Միայն DNS, առանց Cloudflare features |

### Երբ անջատել Proxy.

- WebSockets (եթե խնդիրներ կան)
- Որոշ API ինտեգրացիաներ
- Mail servers (MX գրառումներ)

---

## 4. SSL/TLS {#ssl-tls}

### Կարգավորում.

1. Domain → SSL/TLS → Overview

### Ռեժիմներ.

| Ռեժիմ         | Նկարագրություն                    | Երբ օգտագործել        |
| ------------- | --------------------------------- | --------------------- |
| Off           | HTTPS չկա                         | ❌ ԵՐԵՔԵԼԵՎ           |
| Flexible      | HTTPS մինչև CF, HTTP մինչև origin | ⚠️ Խորհուրդ չի տրվում |
| Full          | HTTPS ամենուր, self-signed OK     | Թեստավորման համար     |
| Full (strict) | HTTPS ամենուր, valid cert         | ✅ ԽՈՐՀՈՒՐԴ ՏՐՎՈՒՄ    |

### Խորհուրդ տրվող կարգավորում.

```
SSL/TLS Mode: Full (strict)
Always Use HTTPS: ON
Automatic HTTPS Rewrites: ON
Minimum TLS Version: 1.2
```

### Edge Certificates.

1. SSL/TLS → Edge Certificates
2. "Universal SSL" ավտոմատ միացված է
3. Wildcard (\*.example.com)-ի համար — կարգավորել

---

## 5. CDN & Caching {#cdn-caching}

### Caching կարգավորում.

1. Domain → Caching → Configuration

### Հիմնական կարգավորումներ.

```
Caching Level: Standard
Browser Cache TTL: Respect Existing Headers
Crawler Hints: ON
```

### Cache Rules.

1. Caching → Cache Rules → Create Rule

#### Օրինակ. Cache անել ստատիկան

```
Name: Cache static assets
When: URI Path contains /static OR File Extension in (jpg, png, gif, css, js)
Then:
  - Cache eligibility: Eligible for cache
  - Edge TTL: 1 month
  - Browser TTL: 1 week
```

#### Օրինակ. API-ն cache չանել

```
Name: Bypass API
When: URI Path starts with /api
Then:
  - Cache eligibility: Bypass cache
```

### Purge Cache.

1. Caching → Configuration → Purge Cache
2. Ընտրի՛ր.
   - Purge Everything — ամեն ինչ
   - Custom Purge — կոնկրետ URL-ներ

### Ծրագրային purge.

```typescript
// Կոնտենտի թարմացումից հետո
async function purgeCache(urls: string[]) {
  await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ files: urls }),
  });
}
```

---

## 6. R2 Storage {#r2-storage}

> S3-համատեղելի object storage։ Ավելի էժան քան S3, առանց egress fees։

### Bucket ստեղծում.

1. Dashboard → R2 → Create bucket
2. Name: `my-bucket`
3. Location: Auto (կամ կոնկրետ region)

### Pricing.

| Ռեսուրս             | Գին                |
| ------------------- | ------------------ |
| Storage             | $0.015 / GB / ամիս |
| Class A ops (write) | $4.50 / million    |
| Class B ops (read)  | $0.36 / million    |
| Egress              | FREE               |

### Մուտքի կարգավորում.

#### Հրապարակային մուտք (static assets-ի համար).

1. R2 → bucket → Settings
2. Public access → Enable
3. Custom domain (ընտրովի).
   - `files.example.com`
   - Ավելացրու՛ CNAME DNS-ում

#### API մուտք.

1. R2 → Manage R2 API Tokens
2. Create API Token.
   - Permissions: Object Read & Write
   - Specify bucket(s)
3. Ստացի՛ր.
   - Account ID
   - Access Key ID
   - Secret Access Key

### Next.js-ով օգտագործում.

```typescript
// lib/r2.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// Ֆայլի բեռնում
export async function uploadToR2(key: string, body: Buffer | Uint8Array, contentType: string) {
  await R2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );

  return `https://${process.env.R2_PUBLIC_URL}/${key}`;
}

// Presigned URL բեռնման համար
export async function getUploadUrl(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  return await getSignedUrl(R2, command, { expiresIn: 3600 });
}
```

### Environment Variables.

```bash
CF_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=my-bucket
R2_PUBLIC_URL=files.example.com
```

---

## 7. WAF (Web Application Firewall) {#waf}

### Free պլան.

- Հիմնական managed rules
- 5 custom rules

### Pro+ պլան.

- OWASP Core Ruleset
- Cloudflare Managed Ruleset
- Unlimited custom rules

### Կարգավորում.

1. Domain → Security → WAF

### Managed Rules.

1. WAF → Managed Rules
2. Միացրու՛.
   - Cloudflare Managed Ruleset
   - Cloudflare OWASP Core Ruleset (Pro+)

### Custom Rules.

1. WAF → Custom Rules → Create Rule

#### Օրինակ. Արկել երկրներ

```
Name: Block countries
When: ip.geoip.country in {"RU" "CN" "KP"}
Then: Block
```

#### Օրինակ. Rate limiting API-ի համար

```
Name: API Rate Limit
When: http.request.uri.path starts with "/api"
Then: Rate limit
  - Requests: 100
  - Period: 1 minute
  - Action: Block
```

#### Օրինակ. Ադմինի պաշտպանություն

```
Name: Protect Admin
When:
  http.request.uri.path starts with "/admin" AND
  NOT ip.src in {1.2.3.4 5.6.7.8}
Then: Block
```

---

## 8. DDoS Protection {#ddos}

### Լռելյայն միացված.

- Layer 3/4 DDoS mitigation
- HTTP DDoS protection

### Կարգավորում.

1. Security → DDoS
2. HTTP DDoS attack protection.
   - Sensitivity: High (խորհուրդ տրվող)
   - Action: Block

### Under Attack Mode.

Արտակարգ իրավիճակների համար.

1. Overview → Under Attack Mode → ON
2. Բոլոր այցելուները անցնում են JS challenge

### Bot Fight Mode.

1. Security → Bots → Bot Fight Mode: ON
2. Արկելում է հայտնի bad bots-ին

---

## 9. Page Rules {#page-rules}

> Հնացել է Rules-ի օգտին, բայց դեռ աշխատում է։

### Օրինակներ.

#### Redirect www to non-www.

```
URL: www.example.com/*
Setting: Forwarding URL (301)
Destination: https://example.com/$1
```

#### Force HTTPS.

```
URL: http://example.com/*
Setting: Always Use HTTPS
```

#### Cache Everything.

```
URL: example.com/static/*
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 month
```

---

## 10. Workers {#workers}

> Serverless functions edge-ում։

### Ստեղծում.

1. Workers & Pages → Create Application
2. Create Worker

### Worker-ի օրինակ.

```javascript
// Redirect ըստ երկրի
export default {
  async fetch(request) {
    const country = request.cf?.country;

    if (country === 'DE') {
      return Response.redirect('https://de.example.com' + new URL(request.url).pathname, 302);
    }

    return fetch(request);
  },
};
```

### Դոմենին կապել.

1. Worker → Settings → Triggers
2. Add Route: `example.com/*`

---

## 11. Analytics {#analytics}

### Web Analytics.

1. Analytics & Logs → Web Analytics
2. Միացրու՛ դոմենի համար

### Մետրիկներ.

- Requests
- Bandwidth
- Unique Visitors
- Page Views
- Threats blocked
- Cache hit ratio

### GraphQL API.

```graphql
query {
  viewer {
    zones(filter: { zoneTag: $zoneTag }) {
      httpRequests1dGroups(limit: 7, filter: { date_gt: "2024-01-01" }) {
        dimensions {
          date
        }
        sum {
          requests
          bytes
          cachedBytes
        }
      }
    }
  }
}
```

---

## ✅ Checklist {#checklist}

### Նախնական կարգավորում.

- [ ] Հաշիվ ստեղծված
- [ ] Դոմեն ավելացված
- [ ] Nameservers-ը փոխված ռեգիստրատորում
- [ ] Ստատուս "Active"

### DNS.

- [ ] A/CNAME գրառումներ Vercel-ի համար
- [ ] MX գրառումներ email-ի համար (անհրաժեշտության դեպքում)
- [ ] TXT գրառումներ verification-ի համար

### SSL/TLS.

- [ ] Mode: Full (strict)
- [ ] Always Use HTTPS: ON
- [ ] Minimum TLS Version: 1.2

### Caching.

- [ ] Cache Rules ստատիկայի համար
- [ ] Bypass API/dynamic content-ի համար
- [ ] Browser Cache TTL կարգավորված

### R2 Storage (անհրաժեշտության դեպքում).

- [ ] Bucket ստեղծված
- [ ] Public access կամ API access կարգավորված
- [ ] Custom domain (ընտրովի)
- [ ] CORS կարգավորված

### Security.

- [ ] WAF Managed Rules միացված
- [ ] Bot Fight Mode: ON
- [ ] Rate Limiting API-ի համար
- [ ] DDoS protection կարգավորված

### Performance.

- [ ] Auto Minify: JS, CSS, HTML
- [ ] Brotli: ON
- [ ] Early Hints: ON
- [ ] HTTP/3: ON

---

**Տարբերակ.** 1.0

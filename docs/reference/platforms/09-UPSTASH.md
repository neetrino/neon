# Upstash — Полная настройка

> Upstash — serverless Redis и Kafka. Идеален для кэширования, rate limiting, очередей.

---

## 📋 СОДЕРЖАНИЕ

1. [Создание аккаунта](#создание-аккаунта)
2. [Создание Redis базы](#создание-redis)
3. [Интеграция с Next.js](#nextjs-интеграция)
4. [Rate Limiting](#rate-limiting)
5. [Кэширование](#кэширование)
6. [Очереди (QStash)](#очереди)
7. [Session Storage](#sessions)
8. [Vercel Integration](#vercel-integration)
9. [Checklist](#checklist)

---

## 1. Создание аккаунта {#создание-аккаунта}

### Шаги:

1. Перейти на [upstash.com](https://upstash.com)
2. "Sign Up" → GitHub / Google / Email
3. Подтвердить email

### Pricing:

| План          | Стоимость          | Requests        |
| ------------- | ------------------ | --------------- |
| Free          | $0                 | 10,000/day      |
| Pay-as-you-go | $0.2/100K requests | Unlimited       |
| Pro           | $280/month         | High throughput |

### Free tier:

- 10,000 commands/day
- 256 MB storage
- 1 database
- Global replication

---

## 2. Создание Redis базы {#создание-redis}

### Через UI:

1. Console → "Create Database"
2. Настройки:
   - **Name:** my-app-cache
   - **Type:** Regional (дешевле) или Global (быстрее)
   - **Region:** US-East-1 (ближе к Vercel)
   - **TLS:** Enabled (обязательно)

### После создания:

Получить credentials:

- **UPSTASH_REDIS_REST_URL:** `https://xxx.upstash.io`
- **UPSTASH_REDIS_REST_TOKEN:** `AXxxxx`

---

## 3. Интеграция с Next.js {#nextjs-интеграция}

### Установка:

```bash
npm install @upstash/redis
```

### Базовое использование:

```typescript
// lib/redis.ts
import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Использование
await redis.set('key', 'value');
await redis.set('key', 'value', { ex: 3600 }); // TTL 1 hour

const value = await redis.get('key');
await redis.del('key');

// JSON
await redis.set('user:123', { name: 'John', age: 30 });
const user = await redis.get<{ name: string; age: number }>('user:123');

// Increment
await redis.incr('counter');
await redis.incrby('counter', 5);

// Lists
await redis.lpush('queue', 'item1');
await redis.rpop('queue');

// Sets
await redis.sadd('tags', 'react', 'nextjs');
await redis.smembers('tags');

// Hashes
await redis.hset('user:123', { name: 'John', email: 'john@example.com' });
await redis.hget('user:123', 'name');
await redis.hgetall('user:123');
```

### Environment Variables:

```bash
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxxxx
```

---

## 4. Rate Limiting {#rate-limiting}

### Установка:

```bash
npm install @upstash/ratelimit
```

### Базовый Rate Limiter:

```typescript
// lib/ratelimit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Sliding window: 10 requests per 10 seconds
export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  analytics: true,
  prefix: '@upstash/ratelimit',
});
```

### В API Route (Next.js):

```typescript
// app/api/route.ts
import { ratelimit } from '@/lib/ratelimit';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Получить IP
  const ip = request.ip ?? request.headers.get('x-forwarded-for') ?? '127.0.0.1';

  // Проверить лимит
  const { success, limit, reset, remaining } = await ratelimit.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
        },
      },
    );
  }

  // Обработка запроса
  return NextResponse.json({ success: true });
}
```

### Middleware (для всего приложения):

```typescript
// middleware.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 req/min
});

export async function middleware(request: NextRequest) {
  // Только для API routes
  if (!request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  const ip = request.ip ?? '127.0.0.1';
  const { success } = await ratelimit.limit(ip);

  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
```

### Разные лимиты для разных endpoints:

```typescript
// Строгий для auth
const authLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 req/min
  prefix: 'ratelimit:auth',
});

// Мягкий для API
const apiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 req/min
  prefix: 'ratelimit:api',
});

// По user ID вместо IP
const { success } = await ratelimit.limit(`user:${userId}`);
```

### Алгоритмы:

```typescript
// Fixed Window - сбрасывается в конце периода
Ratelimit.fixedWindow(10, '1 m');

// Sliding Window - плавное скольжение (рекомендуется)
Ratelimit.slidingWindow(10, '1 m');

// Token Bucket - пополняемый bucket
Ratelimit.tokenBucket(10, '1 m', 5); // max 10, refill 5/min
```

---

## 5. Кэширование {#кэширование}

### Базовый паттерн:

```typescript
// lib/cache.ts
import { redis } from './redis';

export async function cached<T>(
  key: string,
  fn: () => Promise<T>,
  ttlSeconds: number = 3600,
): Promise<T> {
  // Попробовать получить из кэша
  const cached = await redis.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Вычислить и сохранить
  const result = await fn();
  await redis.set(key, result, { ex: ttlSeconds });

  return result;
}

// Использование
const products = await cached(
  'products:featured',
  () => prisma.product.findMany({ where: { featured: true } }),
  300, // 5 минут
);
```

### С тегами для инвалидации:

```typescript
// lib/cache.ts
export async function cachedWithTags<T>(
  key: string,
  tags: string[],
  fn: () => Promise<T>,
  ttlSeconds: number = 3600,
): Promise<T> {
  const cached = await redis.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  const result = await fn();

  // Сохранить данные
  await redis.set(key, result, { ex: ttlSeconds });

  // Связать с тегами
  for (const tag of tags) {
    await redis.sadd(`tag:${tag}`, key);
  }

  return result;
}

export async function invalidateTag(tag: string): Promise<void> {
  const keys = await redis.smembers(`tag:${tag}`);
  if (keys.length > 0) {
    await redis.del(...keys);
    await redis.del(`tag:${tag}`);
  }
}

// Использование
const products = await cachedWithTags(
  `products:category:${categoryId}`,
  ['products', `category:${categoryId}`],
  () => fetchProducts(categoryId),
);

// При обновлении продукта
await invalidateTag('products');
```

### React Query + Redis:

```typescript
// В Server Component или API Route
export async function getProducts() {
  return cached(
    'products:all',
    () => prisma.product.findMany(),
    60, // 1 минута
  );
}

// В Client Component с React Query
const { data } = useQuery({
  queryKey: ['products'],
  queryFn: () => fetch('/api/products').then((r) => r.json()),
  staleTime: 60 * 1000, // Синхронизировать с Redis TTL
});
```

---

## 6. Очереди (QStash) {#очереди}

> QStash — serverless message queue от Upstash.

### Создание:

1. Console → QStash
2. Получить `QSTASH_TOKEN`

### Установка:

```bash
npm install @upstash/qstash
```

### Отправка в очередь:

```typescript
// lib/qstash.ts
import { Client } from '@upstash/qstash';

const qstash = new Client({
  token: process.env.QSTASH_TOKEN!,
});

// Отправить задачу
export async function enqueue(url: string, body: unknown) {
  await qstash.publishJSON({
    url,
    body,
    retries: 3,
  });
}

// С задержкой
export async function scheduleTask(url: string, body: unknown, delay: number) {
  await qstash.publishJSON({
    url,
    body,
    delay, // seconds
  });
}

// Cron задача
export async function scheduleCron(url: string, cron: string) {
  await qstash.schedules.create({
    destination: url,
    cron,
  });
}
```

### Обработчик очереди:

```typescript
// app/api/queue/email/route.ts
import { verifySignature } from '@upstash/qstash/nextjs';

async function handler(request: Request) {
  const body = await request.json();

  // Отправить email
  await sendEmail(body.to, body.subject, body.html);

  return new Response('OK');
}

// Верификация что запрос от QStash
export const POST = verifySignature(handler);
```

### Пример: Email очередь

```typescript
// При регистрации
await enqueue('https://myapp.com/api/queue/email', {
  to: user.email,
  subject: 'Welcome!',
  template: 'welcome',
});
```

---

## 7. Session Storage {#sessions}

### NextAuth + Upstash:

```bash
npm install @upstash/redis @auth/upstash-redis-adapter
```

```typescript
// auth.ts
import NextAuth from 'next-auth';
import { UpstashRedisAdapter } from '@auth/upstash-redis-adapter';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: UpstashRedisAdapter(redis),
  providers: [
    // ...providers
  ],
});
```

### Кастомные сессии:

```typescript
// lib/session.ts
import { redis } from './redis';
import { nanoid } from 'nanoid';

const SESSION_TTL = 7 * 24 * 60 * 60; // 7 days

export async function createSession(userId: string): Promise<string> {
  const sessionId = nanoid();

  await redis.set(`session:${sessionId}`, { userId, createdAt: Date.now() }, { ex: SESSION_TTL });

  return sessionId;
}

export async function getSession(sessionId: string) {
  return redis.get<{ userId: string; createdAt: number }>(`session:${sessionId}`);
}

export async function deleteSession(sessionId: string) {
  await redis.del(`session:${sessionId}`);
}

export async function refreshSession(sessionId: string) {
  await redis.expire(`session:${sessionId}`, SESSION_TTL);
}
```

---

## 8. Vercel Integration {#vercel-integration}

### Автоматическая настройка:

1. Vercel Dashboard → Project → Storage
2. "Create Database" → Upstash Redis
3. Environment variables добавятся автоматически:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### Или через Upstash Console:

1. Upstash Console → Database → Integrations
2. "Connect to Vercel"
3. Выбрать Vercel project

---

## ✅ Checklist {#checklist}

### Первоначальная настройка:

- [ ] Аккаунт создан
- [ ] Redis database создана
- [ ] Region выбран (близко к Vercel)
- [ ] TLS включён

### Environment Variables:

- [ ] UPSTASH_REDIS_REST_URL добавлен
- [ ] UPSTASH_REDIS_REST_TOKEN добавлен
- [ ] Vercel integration (опционально)

### Rate Limiting:

- [ ] @upstash/ratelimit установлен
- [ ] Limiter настроен для API
- [ ] Auth endpoints имеют строгие лимиты

### Кэширование:

- [ ] Паттерн кэширования реализован
- [ ] TTL настроены
- [ ] Инвалидация работает

### Очереди (если нужны):

- [ ] QStash настроен
- [ ] Обработчики верифицируют подпись
- [ ] Retries настроены

---

**Версия:** 1.0

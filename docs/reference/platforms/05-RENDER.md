# Render — Полная настройка

> Render — платформа для деплоя web services, static sites, databases.

---

## 📋 СОДЕРЖАНИЕ

1. [Создание аккаунта](#создание-аккаунта)
2. [Типы сервисов](#типы-сервисов)
3. [Web Service (Backend)](#web-service)
4. [Environment Variables](#environment-variables)
5. [Databases](#databases)
6. [Background Workers](#workers)
7. [Cron Jobs](#cron-jobs)
8. [Custom Domains](#domains)
9. [Blueprints (IaC)](#blueprints)
10. [Checklist](#checklist)

---

## 1. Создание аккаунта {#создание-аккаунта}

### Шаги:

1. Перейти на [render.com](https://render.com)
2. "Get Started" → GitHub / GitLab / Email
3. Подтвердить email

### Pricing:

| План       | Web Service     | Особенности                         |
| ---------- | --------------- | ----------------------------------- |
| Free       | 750 hours/month | Cold starts, spin down after 15 min |
| Individual | From $7/month   | No spin down                        |
| Team       | From $19/month  | Team features                       |

### Free tier ограничения:

- Spin down после 15 минут неактивности
- Cold start при первом запросе (~30-60 сек)
- 750 hours/month (достаточно для 1 сервиса)

---

## 2. Типы сервисов {#типы-сервисов}

| Тип               | Назначение        | Пример                  |
| ----------------- | ----------------- | ----------------------- |
| Web Service       | HTTP API, backend | NestJS, Express         |
| Static Site       | Frontend          | React, Next.js (static) |
| Background Worker | Async tasks       | Queue processors        |
| Cron Job          | Scheduled tasks   | Daily reports           |
| Private Service   | Internal only     | Internal API            |
| PostgreSQL        | Database          | -                       |
| Redis             | Cache/Queue       | -                       |

---

## 3. Web Service (Backend) {#web-service}

### Создание:

1. Dashboard → "New" → "Web Service"
2. Connect repository (GitHub/GitLab)
3. Настройки:
   - **Name:** api-service
   - **Region:** Oregon (US West) / Frankfurt (EU)
   - **Branch:** main
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start:prod`

### Настройки (render.yaml):

```yaml
services:
  - type: web
    name: api
    env: node
    region: oregon
    plan: starter
    buildCommand: npm install && npm run build
    startCommand: npm run start:prod
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: mydb
          property: connectionString
```

### Docker деплой:

Если есть Dockerfile:

```yaml
services:
  - type: web
    name: api
    env: docker
    dockerfilePath: ./Dockerfile
    dockerContext: .
```

### Health Checks:

```typescript
// NestJS
@Controller()
export class HealthController {
  @Get('health')
  check() {
    return { status: 'ok' };
  }
}
```

В настройках:

- Health Check Path: `/health`

---

## 4. Environment Variables {#environment-variables}

### Через UI:

1. Service → Environment
2. Add Environment Variable

### Типы:

| Тип           | Описание                      |
| ------------- | ----------------------------- |
| Plain text    | Обычная строка                |
| Secret file   | Файл (.env, credentials.json) |
| From Database | Ссылка на БД                  |
| From Service  | Ссылка на другой сервис       |

### Пример для NestJS:

```bash
# Server
PORT=10000  # Render использует PORT
NODE_ENV=production

# Database (from database)
DATABASE_URL=<from database>

# Auth
JWT_SECRET=your-secret-32-chars
JWT_EXPIRES_IN=15m

# CORS
CORS_ORIGIN=https://your-frontend.vercel.app
```

### Environment Groups:

1. Account Settings → Environment Groups
2. Создать группу переменных
3. Привязать к нескольким сервисам

---

## 5. Databases {#databases}

### PostgreSQL:

1. Dashboard → "New" → "PostgreSQL"
2. Настройки:
   - **Name:** mydb
   - **Database:** mydb
   - **User:** mydb_user
   - **Region:** Oregon
   - **Plan:** Free / Starter

### Connection String:

```
Internal: postgres://user:pass@dpg-xxx.oregon-postgres.render.com/mydb
External: postgres://user:pass@dpg-xxx.oregon-postgres.render.com/mydb
```

### В Web Service:

```yaml
envVars:
  - key: DATABASE_URL
    fromDatabase:
      name: mydb
      property: connectionString
```

### Redis:

1. Dashboard → "New" → "Redis"
2. Настройки аналогичны PostgreSQL

### Подключение из Prisma:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Backups (платные планы):

- Daily automated backups
- Point-in-time recovery
- Manual snapshots

---

## 6. Background Workers {#workers}

> Для обработки очередей, async tasks.

### Создание:

1. Dashboard → "New" → "Background Worker"
2. Настройки как у Web Service, но без HTTP

### Пример (BullMQ worker):

```typescript
// worker.ts
import { Worker } from 'bullmq';

const worker = new Worker(
  'email-queue',
  async (job) => {
    console.log('Processing job:', job.id);
    await sendEmail(job.data);
  },
  {
    connection: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT),
    },
  },
);

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});
```

### render.yaml:

```yaml
services:
  - type: worker
    name: email-worker
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm run worker
    envVars:
      - key: REDIS_URL
        fromService:
          type: redis
          name: cache
          property: connectionString
```

---

## 7. Cron Jobs {#cron-jobs}

### Создание:

1. Dashboard → "New" → "Cron Job"
2. Настройки:
   - **Schedule:** `0 0 * * *` (каждый день в полночь)
   - **Command:** `npm run daily-report`

### render.yaml:

```yaml
services:
  - type: cron
    name: daily-cleanup
    env: node
    schedule: '0 2 * * *' # 2 AM daily
    buildCommand: npm install && npm run build
    startCommand: npm run cleanup
```

### Cron expressions:

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6)
│ │ │ │ │
* * * * *
```

Примеры:

- `0 * * * *` — каждый час
- `0 0 * * *` — каждый день в полночь
- `0 0 * * 0` — каждое воскресенье
- `0 0 1 * *` — первого числа каждого месяца

---

## 8. Custom Domains {#domains}

### Добавление:

1. Service → Settings → Custom Domains
2. "Add Custom Domain"
3. Ввести: `api.example.com`

### DNS настройка:

```
Type: CNAME
Name: api
Value: your-service.onrender.com
```

### SSL:

- Автоматический через Let's Encrypt
- Wildcard не поддерживается на Free

---

## 9. Blueprints (Infrastructure as Code) {#blueprints}

### render.yaml в корне репозитория:

```yaml
# render.yaml
databases:
  - name: mydb
    databaseName: mydb
    user: mydb_user
    plan: free
    region: oregon

services:
  # Web Service (API)
  - type: web
    name: api
    env: node
    region: oregon
    plan: starter
    branch: main
    buildCommand: npm ci && npm run build
    startCommand: npm run start:prod
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: mydb
          property: connectionString
      - key: JWT_SECRET
        generateValue: true # Auto-generate
      - key: CORS_ORIGIN
        sync: false # Set manually
    autoDeploy: true

  # Background Worker
  - type: worker
    name: queue-worker
    env: node
    region: oregon
    plan: starter
    buildCommand: npm ci && npm run build
    startCommand: npm run worker
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: mydb
          property: connectionString

  # Cron Job
  - type: cron
    name: daily-cleanup
    env: node
    region: oregon
    schedule: '0 2 * * *'
    buildCommand: npm ci && npm run build
    startCommand: npm run cleanup

  # Redis
  - type: redis
    name: cache
    plan: free
    region: oregon
    maxmemoryPolicy: allkeys-lru
```

### Деплой Blueprint:

1. Dashboard → "New" → "Blueprint"
2. Connect repository с render.yaml
3. Render создаст все ресурсы автоматически

---

## ✅ Checklist {#checklist}

### Первоначальная настройка:

- [ ] Аккаунт создан
- [ ] GitHub/GitLab подключён
- [ ] Billing настроен (если не Free)

### Web Service:

- [ ] Service создан
- [ ] Repository подключён
- [ ] Build/Start commands правильные
- [ ] Region выбран (близко к пользователям)
- [ ] Health check path настроен

### Environment Variables:

- [ ] DATABASE_URL настроен
- [ ] JWT_SECRET настроен
- [ ] NODE_ENV=production
- [ ] PORT не указан (Render устанавливает сам)
- [ ] CORS_ORIGIN указан

### Database:

- [ ] PostgreSQL создан
- [ ] fromDatabase reference используется
- [ ] Backups настроены (если платный план)

### Domains:

- [ ] Custom domain добавлен
- [ ] DNS CNAME настроен
- [ ] SSL работает

### Performance:

- [ ] Plan соответствует нагрузке
- [ ] Free tier: понимаете cold starts
- [ ] Starter+: no spin down

### Blueprint (опционально):

- [ ] render.yaml создан
- [ ] Все сервисы описаны
- [ ] Environment variables правильные

---

**Версия:** 1.0

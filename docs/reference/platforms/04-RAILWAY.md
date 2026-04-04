# Railway — Полная настройка

> Railway — платформа для деплоя backend приложений (NestJS, Express, и др.)

---

## 📋 СОДЕРЖАНИЕ

1. [Создание аккаунта](#создание-аккаунта)
2. [Создание проекта](#создание-проекта)
3. [Деплой из GitHub](#деплой-github)
4. [Environment Variables](#environment-variables)
5. [Domains](#domains)
6. [Databases](#databases)
7. [Private Networking](#private-networking)
8. [Monitoring & Logs](#monitoring)
9. [Scaling](#scaling)
10. [CLI](#cli)
11. [Checklist](#checklist)

---

## 1. Создание аккаунта {#создание-аккаунта}

### Шаги:

1. Перейти на [railway.app](https://railway.app)
2. "Login" → GitHub
3. Авторизовать Railway

### Pricing:

| План  | Стоимость        | Включено             |
| ----- | ---------------- | -------------------- |
| Trial | Free             | $5 credit, 500 hours |
| Hobby | $5/месяц         | $5 credit включён    |
| Pro   | $20/месяц/member | Team features        |

### Usage-based pricing:

| Ресурс         | Цена                    |
| -------------- | ----------------------- |
| vCPU           | $0.000463 / minute      |
| RAM            | $0.000231 / GB / minute |
| Network egress | $0.10 / GB              |

---

## 2. Создание проекта {#создание-проекта}

### Через UI:

1. Dashboard → "New Project"
2. Выбрать:
   - **Deploy from GitHub repo**
   - **Deploy a Template** (starter)
   - **Provision a Database**
   - **Empty Project**

### Структура проекта Railway:

```
Project
├── Service 1 (backend API)
├── Service 2 (worker)
├── PostgreSQL (database)
└── Redis (cache)
```

---

## 3. Деплой из GitHub {#деплой-github}

### Подключение репозитория:

1. New Project → "Deploy from GitHub repo"
2. Выбрать репозиторий
3. Выбрать branch (main)
4. Railway автоматически определяет:
   - Runtime (Node.js, Python, Go, etc.)
   - Build command
   - Start command

### Настройка (Settings):

```yaml
# Root Directory (для monorepo)
Root Directory: apps/api

# Build Command
Build Command: npm run build

# Start Command
Start Command: npm run start:prod

# Watch Paths (когда деплоить)
Watch Paths: /apps/api/**
```

### Nixpacks (builder):

Railway использует Nixpacks для автоматического определения build.

Для кастомизации создайте `nixpacks.toml`:

```toml
[phases.setup]
nixPkgs = ["nodejs-18_x", "npm-9_x"]

[phases.install]
cmds = ["npm ci"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npm run start:prod"
```

Или `railway.toml`:

```toml
[build]
builder = "nixpacks"
buildCommand = "npm run build"

[deploy]
startCommand = "npm run start:prod"
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3
```

---

## 4. Environment Variables {#environment-variables}

### Через UI:

1. Service → Variables
2. "New Variable" или "Raw Editor"

### Типы переменных:

| Тип       | Пример                          |
| --------- | ------------------------------- |
| Plain     | `PORT=3000`                     |
| Secret    | `DATABASE_URL=postgresql://...` |
| Reference | `${{Postgres.DATABASE_URL}}`    |

### Reference Variables:

```bash
# Ссылка на переменную другого сервиса
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}

# Ссылка на internal hostname
API_URL=http://${{api.RAILWAY_PRIVATE_DOMAIN}}:3000
```

### Shared Variables (Project level):

1. Project Settings → Shared Variables
2. Доступны всем сервисам в проекте

### Обязательные для NestJS:

```bash
# Server
PORT=3000
NODE_ENV=production

# Database
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Auth
JWT_SECRET=your-jwt-secret-min-32-chars
JWT_EXPIRES_IN=15m

# CORS
CORS_ORIGIN=https://your-frontend.vercel.app

# Logging
LOG_LEVEL=info
```

---

## 5. Domains {#domains}

### Railway Domain:

Автоматически: `your-service.up.railway.app`

1. Service → Settings → Networking
2. "Generate Domain"

### Custom Domain:

1. Settings → Networking → Custom Domain
2. Ввести: `api.example.com`
3. Добавить DNS запись:

```
Type: CNAME
Name: api
Value: your-service.up.railway.app
```

### HTTPS:

- Автоматический SSL через Let's Encrypt
- Принудительный HTTPS

---

## 6. Databases {#databases}

### PostgreSQL:

1. Project → "New" → Database → PostgreSQL
2. Автоматически создаются переменные:
   - `DATABASE_URL`
   - `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`

### Redis:

1. Project → "New" → Database → Redis
2. Переменные:
   - `REDIS_URL`
   - `REDISHOST`, `REDISPORT`, `REDISUSER`, `REDISPASSWORD`

### MySQL:

1. Project → "New" → Database → MySQL
2. Переменные аналогичны PostgreSQL

### Подключение к БД:

```bash
# Через Railway CLI
railway connect postgres

# Через psql
psql $DATABASE_URL
```

### Backups:

- Автоматические daily snapshots (Pro plan)
- Point-in-time recovery до 7 дней

### Миграции (с Prisma):

```bash
# Локально (с проброшенным DATABASE_URL)
railway run npx prisma migrate deploy

# Или в Build Command
npm run build && npx prisma migrate deploy
```

---

## 7. Private Networking {#private-networking}

### Internal Communication:

Сервисы в одном проекте могут общаться через internal network.

```bash
# Каждый сервис получает internal hostname
RAILWAY_PRIVATE_DOMAIN=api.railway.internal

# URL для внутренних запросов
http://api.railway.internal:3000
```

### Пример:

```typescript
// В worker сервисе
const API_URL = process.env.RAILWAY_PRIVATE_DOMAIN
  ? `http://${process.env.RAILWAY_PRIVATE_DOMAIN}:3000`
  : 'http://localhost:3000';
```

### Private Network настройка:

1. Service → Settings → Networking
2. Enable "Private Networking"

---

## 8. Monitoring & Logs {#monitoring}

### Logs:

1. Service → Deployments → выбрать deployment
2. Вкладка "Logs"

### Real-time logs:

```bash
# Через CLI
railway logs -f
```

### Metrics:

1. Service → Metrics
2. Доступны:
   - CPU usage
   - Memory usage
   - Network I/O

### Health Checks:

```toml
# railway.toml
[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 100
```

```typescript
// NestJS health endpoint
@Controller()
export class HealthController {
  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
```

### Alerts (Pro):

1. Project Settings → Observability
2. Connect to:
   - Datadog
   - Grafana
   - Custom webhook

---

## 9. Scaling {#scaling}

### Horizontal Scaling:

1. Service → Settings → Scaling
2. "Enable Horizontal Scaling"
3. Set replicas: 2-10

### Vertical Scaling:

1. Service → Settings → Resources
2. Настроить:
   - vCPU: 0.5 - 32
   - Memory: 512 MB - 32 GB

### Auto-scaling (Pro):

- Scale based on CPU/Memory
- Scale based on requests

### Рекомендации:

| Нагрузка | vCPU | RAM    |
| -------- | ---- | ------ |
| Dev/Low  | 0.5  | 512 MB |
| Medium   | 1    | 1 GB   |
| High     | 2+   | 2+ GB  |

---

## 10. CLI {#cli}

### Установка:

```bash
# npm
npm install -g @railway/cli

# brew (macOS)
brew install railway
```

### Авторизация:

```bash
railway login
```

### Основные команды:

```bash
# Привязать к проекту
railway link

# Деплой
railway up

# Переменные
railway variables
railway variables set KEY=value

# Логи
railway logs
railway logs -f  # follow

# Shell в контейнере
railway shell

# Подключение к БД
railway connect postgres

# Запуск команды с переменными окружения
railway run npm run migrate
```

### CI/CD с CLI:

```yaml
# .github/workflows/deploy.yml
- name: Install Railway CLI
  run: npm install -g @railway/cli

- name: Deploy to Railway
  env:
    RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
  run: railway up --service api
```

---

## ✅ Checklist {#checklist}

### Первоначальная настройка:

- [ ] Аккаунт создан
- [ ] Billing настроен (привязана карта)
- [ ] GitHub подключён

### Проект:

- [ ] Project создан
- [ ] Repository подключён
- [ ] Build/Start commands правильные
- [ ] Root directory указан (если monorepo)

### Environment Variables:

- [ ] DATABASE_URL настроен
- [ ] JWT_SECRET настроен
- [ ] NODE_ENV=production
- [ ] CORS_ORIGIN указан
- [ ] Все секреты добавлены

### Database:

- [ ] PostgreSQL/Redis создан
- [ ] Reference variables используются
- [ ] Миграции применяются при деплое

### Networking:

- [ ] Domain настроен
- [ ] Custom domain (если нужен)
- [ ] HTTPS работает
- [ ] Private networking (если несколько сервисов)

### Monitoring:

- [ ] Health check endpoint работает
- [ ] Logs доступны
- [ ] Metrics отслеживаются

### Performance:

- [ ] Resources настроены под нагрузку
- [ ] Scaling настроен (если нужен)

---

**Версия:** 1.0

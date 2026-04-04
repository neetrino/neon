# Fly.io — Полная настройка

> Fly.io — платформа для деплоя контейнеров близко к пользователям (edge).

---

## 📋 СОДЕРЖАНИЕ

1. [Создание аккаунта](#создание-аккаунта)
2. [Установка CLI](#cli-установка)
3. [Создание приложения](#создание-приложения)
4. [Dockerfile](#dockerfile)
5. [fly.toml конфигурация](#fly-toml)
6. [Environment Variables (Secrets)](#secrets)
7. [Databases](#databases)
8. [Domains & Certificates](#domains)
9. [Scaling & Regions](#scaling)
10. [Volumes (Persistent Storage)](#volumes)
11. [Private Networking](#private-networking)
12. [Checklist](#checklist)

---

## 1. Создание аккаунта {#создание-аккаунта}

### Шаги:

1. Перейти на [fly.io](https://fly.io)
2. "Sign Up" → GitHub / Email
3. Привязать карту (нужна для создания apps, но есть free tier)

### Pricing:

| Ресурс    | Free Allowance         | Цена сверх      |
| --------- | ---------------------- | --------------- |
| VMs       | 3 shared-cpu-1x, 256MB | $1.94/month     |
| Bandwidth | 100 GB outbound        | $0.02/GB        |
| Volumes   | 1 GB                   | $0.15/GB/month  |
| IPv4      | -                      | $2/month per IP |
| IPv6      | Unlimited              | Free            |

### Free tier достаточно для:

- 3 небольших приложения
- Или 1 приложение в 3 регионах

---

## 2. Установка CLI {#cli-установка}

### macOS:

```bash
brew install flyctl
```

### Linux:

```bash
curl -L https://fly.io/install.sh | sh
```

### Windows:

```powershell
pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

### Авторизация:

```bash
flyctl auth login
```

---

## 3. Создание приложения {#создание-приложения}

### Новое приложение:

```bash
cd your-project

# Создать приложение
fly launch

# Wizard спросит:
# - App name
# - Region
# - PostgreSQL? Redis?
# - Deploy now?
```

### Или вручную:

```bash
# Создать без деплоя
fly apps create my-app

# Настроить fly.toml
# Задеплоить
fly deploy
```

---

## 4. Dockerfile {#dockerfile}

> Fly.io требует Dockerfile (или использует buildpacks).

### NestJS Dockerfile:

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

USER nestjs

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

### Next.js Dockerfile:

```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

### .dockerignore:

```
node_modules
.git
.env*
*.md
.next
dist
```

---

## 5. fly.toml конфигурация {#fly-toml}

### Базовый:

```toml
# fly.toml
app = "my-app"
primary_region = "iad"  # US East (Virginia)

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  PORT = "3000"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 256
```

### Продвинутый:

```toml
app = "my-app"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1  # Всегда 1 машина работает

  [http_service.concurrency]
    type = "requests"
    hard_limit = 250
    soft_limit = 200

[[services]]
  protocol = "tcp"
  internal_port = 3000

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

  [[services.http_checks]]
    interval = "10s"
    timeout = "2s"
    grace_period = "5s"
    method = "GET"
    path = "/health"

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 512

[deploy]
  release_command = "npx prisma migrate deploy"
```

### Регионы:

| Код | Регион                |
| --- | --------------------- |
| iad | US East (Virginia)    |
| ord | US Central (Chicago)  |
| lax | US West (Los Angeles) |
| fra | Europe (Frankfurt)    |
| lhr | Europe (London)       |
| sin | Asia (Singapore)      |
| syd | Australia (Sydney)    |

---

## 6. Environment Variables (Secrets) {#secrets}

### Установка secrets:

```bash
# Один секрет
fly secrets set DATABASE_URL="postgresql://..."

# Несколько
fly secrets set DATABASE_URL="..." JWT_SECRET="..."

# Из файла
cat .env.production | fly secrets import
```

### Просмотр:

```bash
fly secrets list
```

### Удаление:

```bash
fly secrets unset JWT_SECRET
```

### Обязательные для NestJS:

```bash
fly secrets set \
  DATABASE_URL="postgresql://user:pass@host/db" \
  JWT_SECRET="your-secret-32-chars-min" \
  CORS_ORIGIN="https://your-frontend.vercel.app"
```

---

## 7. Databases {#databases}

### Fly Postgres:

```bash
# Создать кластер
fly postgres create --name my-db

# Подключить к app
fly postgres attach my-db --app my-app

# DATABASE_URL автоматически добавится в secrets
```

### Настройки:

```bash
# Создать с настройками
fly postgres create \
  --name my-db \
  --region iad \
  --vm-size shared-cpu-1x \
  --volume-size 10 \
  --initial-cluster-size 1
```

### Подключение:

```bash
# Проксировать локально
fly proxy 5432 -a my-db

# Подключиться psql
psql postgres://postgres:password@localhost:5432
```

### Fly Redis:

```bash
# Создать
fly redis create --name my-cache

# Подключить
fly redis attach my-cache --app my-app
```

### Внешние БД (Neon):

```bash
# Просто добавить как secret
fly secrets set DATABASE_URL="postgresql://...@neon.tech/..."
```

---

## 8. Domains & Certificates {#domains}

### Fly.io domain:

Автоматически: `my-app.fly.dev`

### Custom domain:

```bash
# Добавить домен
fly certs create api.example.com

# DNS записи
# CNAME: api -> my-app.fly.dev
# Или A: api -> <fly-ip>
```

### Получить IP:

```bash
fly ips list
```

### SSL:

- Автоматический через Let's Encrypt
- Wildcard поддерживается

---

## 9. Scaling & Regions {#scaling}

### Horizontal Scaling:

```bash
# Добавить машины
fly scale count 3

# В разных регионах
fly scale count 2 --region iad
fly scale count 2 --region fra
```

### Vertical Scaling:

```bash
# Увеличить ресурсы
fly scale vm shared-cpu-2x --memory 1024
```

### VM sizes:

| Size           | vCPU          | Memory | Price    |
| -------------- | ------------- | ------ | -------- |
| shared-cpu-1x  | 1 (shared)    | 256 MB | $1.94/mo |
| shared-cpu-2x  | 2 (shared)    | 512 MB | $3.88/mo |
| shared-cpu-4x  | 4 (shared)    | 1 GB   | $7.75/mo |
| performance-1x | 1 (dedicated) | 2 GB   | $29/mo   |
| performance-2x | 2 (dedicated) | 4 GB   | $58/mo   |

### Auto-scaling:

```toml
# fly.toml
[http_service]
  min_machines_running = 1
  auto_stop_machines = true
  auto_start_machines = true
```

---

## 10. Volumes (Persistent Storage) {#volumes}

### Создание:

```bash
fly volumes create data --size 10 --region iad
```

### Монтирование:

```toml
# fly.toml
[mounts]
  source = "data"
  destination = "/app/data"
```

### Использование:

```typescript
// Файлы сохраняются между деплоями
const uploadPath = '/app/data/uploads';
```

---

## 11. Private Networking {#private-networking}

### Internal DNS:

```
<app-name>.internal
```

### Пример:

```typescript
// В одном app подключаемся к другому
const apiUrl = process.env.FLY_REGION
  ? 'http://api.internal:3000' // Internal
  : 'http://localhost:3000'; // Local
```

### WireGuard VPN:

```bash
# Для доступа к internal сети
fly wireguard create
```

---

## ✅ Checklist {#checklist}

### Первоначальная настройка:

- [ ] Аккаунт создан
- [ ] CLI установлен
- [ ] `fly auth login` выполнен
- [ ] Карта привязана

### Приложение:

- [ ] `fly launch` выполнен
- [ ] fly.toml настроен
- [ ] Dockerfile создан и работает
- [ ] .dockerignore настроен

### Secrets:

- [ ] DATABASE_URL настроен
- [ ] JWT_SECRET настроен
- [ ] Все секреты добавлены

### Database:

- [ ] Fly Postgres или внешняя БД подключена
- [ ] Миграции выполняются при деплое

### Domains:

- [ ] Custom domain добавлен
- [ ] DNS настроен (CNAME/A)
- [ ] SSL сертификат выпущен

### Scaling:

- [ ] Регион(ы) выбраны
- [ ] VM size соответствует нагрузке
- [ ] min_machines_running настроен
- [ ] Health checks работают

### Monitoring:

- [ ] `fly logs` работает
- [ ] `fly status` показывает healthy
- [ ] Health check endpoint отвечает

---

**Версия:** 1.0

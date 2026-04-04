# GitHub — Полная настройка

> GitHub — хостинг репозиториев, CI/CD (Actions), Secrets, Environments.

---

## 📋 СОДЕРЖАНИЕ

1. [Создание репозитория](#создание-репозитория)
2. [Branch Protection](#branch-protection)
3. [Secrets](#secrets)
4. [Environments](#environments)
5. [GitHub Actions](#github-actions)
6. [CODEOWNERS](#codeowners)
7. [Issue & PR Templates](#templates)
8. [Checklist](#checklist)

---

## 1. Создание репозитория {#создание-репозитория}

### Настройки при создании:

1. "New repository"
2. Настройки:
   - **Name:** project-name
   - **Visibility:** Private (для коммерческих)
   - **Initialize:** Add README
   - **.gitignore:** Node
   - **License:** MIT (или другая)

### Рекомендуемые настройки:

1. Settings → General:
   - **Default branch:** main
   - **Features:** Issues ✓, Projects ✓
   - **Pull Requests:** Allow squash merging ✓

2. Settings → Branches:
   - Добавить branch protection rules

---

## 2. Branch Protection {#branch-protection}

### Настройка для main:

1. Settings → Branches → "Add rule"
2. Branch name pattern: `main`
3. Rules:

```markdown
## Рекомендуемые правила

### Обязательно

- [x] Require a pull request before merging
  - [x] Require approvals: 1
  - [x] Dismiss stale pull request approvals
- [x] Require status checks to pass
  - [x] Require branches to be up to date
  - Status checks: lint, test, build
- [x] Require conversation resolution

### Рекомендуется

- [x] Require linear history
- [x] Include administrators

### Опционально (для критичных проектов)

- [ ] Require signed commits
- [ ] Lock branch
```

### Для develop (если используется):

```markdown
- [x] Require a pull request before merging
  - [x] Require approvals: 1
- [x] Require status checks to pass
```

---

## 3. Secrets {#secrets}

### Repository Secrets:

1. Settings → Secrets and variables → Actions
2. "New repository secret"

### Обязательные секреты:

```bash
# Database
DATABASE_URL=postgresql://...

# Auth
JWT_SECRET=your-secret-32-chars
NEXTAUTH_SECRET=your-secret-32-chars

# Deployment
VERCEL_TOKEN=xxx
VERCEL_ORG_ID=xxx
VERCEL_PROJECT_ID=xxx

# Neon (если нужны операции с БД в CI)
NEON_API_KEY=xxx
NEON_PROJECT_ID=xxx

# Notifications (опционально)
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

### Environment Secrets:

Секреты специфичные для environment (staging, production):

1. Settings → Environments → выбрать environment
2. Environment secrets

### Organization Secrets:

Для секретов общих для всех репозиториев:

1. Organization Settings → Secrets
2. Доступны всем репозиториям организации

---

## 4. Environments {#environments}

### Создание:

1. Settings → Environments
2. "New environment"

### Рекомендуемые environments:

| Environment | Назначение   | Protection        |
| ----------- | ------------ | ----------------- |
| preview     | PR previews  | -                 |
| staging     | Тестирование | -                 |
| production  | Боевой       | Approval required |

### Настройка production:

1. Environments → production → "Configure"
2. Deployment protection rules:
   - [x] Required reviewers: 1
   - [x] Wait timer: 0 minutes (или больше)
3. Environment secrets:
   - `DATABASE_URL` (production)
   - etc.

### Использование в Actions:

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production # Требует approval
    steps:
      - uses: actions/checkout@v4
      - run: echo "Deploying to production"
```

---

## 5. GitHub Actions {#github-actions}

### Базовый CI Workflow:

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm run lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm run typecheck

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm test

  build:
    runs-on: ubuntu-latest
    needs: [lint, typecheck, test]
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm run build
```

### Security Audit:

```yaml
# .github/workflows/security.yml
name: Security

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 0 * * 1' # Weekly

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm audit --audit-level=high

  secrets-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: trufflesecurity/trufflehog@main
        with:
          extra_args: --only-verified
```

### Deploy Workflow:

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel (Staging)
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

  deploy-production:
    runs-on: ubuntu-latest
    environment: production
    needs: deploy-staging
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel (Production)
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### PR Preview:

```yaml
# .github/workflows/preview.yml
name: Preview

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  preview:
    runs-on: ubuntu-latest
    environment: preview
    steps:
      - uses: actions/checkout@v4

      - name: Deploy Preview
        uses: amondnet/vercel-action@v25
        id: vercel
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

      - name: Comment PR
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `🚀 Preview deployed: ${{ steps.vercel.outputs.preview-url }}`
            })
```

---

## 6. CODEOWNERS {#codeowners}

### Создание:

Файл `.github/CODEOWNERS`:

```
# Default owner
* @username

# Frontend
/src/app/ @frontend-team
/src/components/ @frontend-team

# Backend
/src/api/ @backend-team
/prisma/ @backend-team

# DevOps
/.github/ @devops-team
/Dockerfile @devops-team

# Docs require review from tech lead
/docs/ @tech-lead
```

### Как работает:

- При PR в файлы — автоматически назначаются reviewers
- Можно требовать approval от code owners

---

## 7. Issue & PR Templates {#templates}

### Issue Templates:

```yaml
# .github/ISSUE_TEMPLATE/bug_report.yml
name: Bug Report
description: Report a bug
labels: ['bug']
body:
  - type: textarea
    attributes:
      label: Describe the bug
      placeholder: A clear description of the bug
    validations:
      required: true

  - type: textarea
    attributes:
      label: Steps to reproduce
      placeholder: |
        1. Go to '...'
        2. Click on '...'
        3. See error
    validations:
      required: true

  - type: textarea
    attributes:
      label: Expected behavior
      placeholder: What should happen

  - type: textarea
    attributes:
      label: Screenshots
      placeholder: If applicable, add screenshots
```

```yaml
# .github/ISSUE_TEMPLATE/feature_request.yml
name: Feature Request
description: Suggest a feature
labels: ['enhancement']
body:
  - type: textarea
    attributes:
      label: Description
      placeholder: Clear description of the feature
    validations:
      required: true

  - type: textarea
    attributes:
      label: Use case
      placeholder: Why do you need this feature?
```

### PR Template:

```markdown
<!-- .github/pull_request_template.md -->

## Type of change

- [ ] 🚀 Feature
- [ ] 🐛 Bugfix
- [ ] 🔧 Refactor
- [ ] 📚 Docs

## Description

[What does this PR do?]

## Related Issues

- Closes #

## Checklist

- [ ] Self-review done
- [ ] Tests added/updated
- [ ] Docs updated (if needed)
- [ ] No console.log
- [ ] Types are correct

## Screenshots (if UI change)

| Before | After |
| ------ | ----- |
|        |       |
```

---

## ✅ Checklist {#checklist}

### Repository Setup:

- [ ] Repository создан
- [ ] .gitignore настроен
- [ ] README.md создан
- [ ] License добавлена

### Branch Protection:

- [ ] main branch protected
- [ ] Require PR reviews
- [ ] Require status checks
- [ ] Require linear history (опционально)

### Secrets:

- [ ] DATABASE_URL добавлен
- [ ] JWT_SECRET добавлен
- [ ] VERCEL_TOKEN добавлен (если Vercel)
- [ ] Все секреты добавлены

### Environments:

- [ ] preview создан
- [ ] staging создан
- [ ] production создан (с approval)
- [ ] Environment secrets настроены

### GitHub Actions:

- [ ] CI workflow работает
- [ ] Security audit настроен
- [ ] Deploy workflow настроен (если не Vercel auto)
- [ ] PR preview работает

### Templates:

- [ ] Issue templates созданы
- [ ] PR template создан
- [ ] CODEOWNERS настроен (для команд)

---

**Версия:** 1.0

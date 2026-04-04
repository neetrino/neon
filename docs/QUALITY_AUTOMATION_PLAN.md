# Quality automation — Neon usage dashboard

**Purpose.** After each change, keep the repo consistent with `.cursor/rules` and team standards: TypeScript strict, no `any`, ESLint, formatting, and fast unit tests.

## Local workflow

| Step          | Command / hook                      | What it does                                                         |
| ------------- | ----------------------------------- | -------------------------------------------------------------------- |
| Install       | `pnpm install`                      | Runs `postinstall` (Prisma generate) and `prepare` (Husky git hooks) |
| Before commit | `.husky/pre-commit`                 | `lint-staged`: ESLint `--fix` + Prettier on staged files             |
| Before push   | `.husky/pre-push`                   | `pnpm run ci` → full `eslint .` + `vitest run`                       |
| Manual        | `pnpm run ci`                       | Lint + unit tests (same as pre-push)                                 |
| Format        | `pnpm format` / `pnpm format:check` | Prettier on the tree / verify only                                   |

**Note.** First clone: ensure Husky hooks are active (`pnpm install`). If hooks do not run, run `pnpm exec husky` (or reinstall).

## CI

GitHub Actions workflow `.github/workflows/ci.yml` runs on pushes and pull requests to `main`: `pnpm install`, `pnpm lint`, `pnpm test:ci`.

## Dependencies (dev)

- **ESLint** — `eslint`, `eslint-config-next`, `eslint-config-prettier` (disables rules that conflict with Prettier)
- **Prettier** — formatting; Prettier wins for style conflicts
- **Vitest** — unit tests (`**/*.test.ts`, `**/*.test.tsx`)
- **Husky + lint-staged** — staged-file checks on commit

## DoD reminder

Do not remove tests or disable lint to “go green”. Fix the code or update tests when requirements change (`10-testing.mdc`).

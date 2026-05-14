# Repository Guidelines

## Project Structure & Module Organization
This repository is a `pnpm` monorepo. Top-level workspace scripts live in `package.json`, and app code is split under `packages/`:
- `packages/frontend`: Vue 3 client (`src/`, `public/`)
- `packages/backend`: TypeScript server (`src/`, `public/`, utility scripts in `src/scripts/`)
- `packages/shared`: shared types, enums, schemas, and response helpers (`src/`, tests in `test/`)
- `packages/api-playground`: separate Vite playground for API-facing UI experiments

Build artifacts go to `dist/` inside each package and should not be edited directly.

## Build, Test, and Development Commands
Install once with `pnpm install`.

- `pnpm dev`: builds shared code, builds backend once, then starts backend and frontend together
- `pnpm dev:backend` / `pnpm dev:frontend`: run one app locally
- `pnpm build`: build every workspace package
- `pnpm lint`: run the root ESLint config across the repo
- `pnpm format`: format `ts`, `tsx`, `json`, and `md` files with Prettier
- `pnpm typecheck`: run TypeScript checks in all packages
- `pnpm test`: run workspace tests

Package-specific flows matter too: `pnpm --filter backend test`, `pnpm --filter frontend test:unit`, and `pnpm --filter shared test`.

## Coding Style & Naming Conventions
Use TypeScript and existing package conventions. Frontend code uses Vue SFCs with PascalCase page/component filenames such as `LoginPage.vue`; utility and module files use lowercase or kebab-style names such as `auth.ts` or `error-response.ts`.

Prefer the formatter and linter over manual styling. The repo uses ESLint and Prettier, with stricter typed rules at the root and package-specific Vue/Vitest configs in frontend packages.

## Testing Guidelines
Backend tests run with Vitest. Frontend unit tests use Vitest with `jsdom`. Shared package tests use Node’s built-in runner and live in `packages/shared/test/*.test.js`.

Add tests next to the affected package and keep names aligned with the current pattern: `*.test.ts`, `*.spec.ts`, or `*.test.js`.

## Commit & Pull Request Guidelines
Current history favors short, imperative, intent-first commit subjects, for example: `Harden auth session invariants and simplify session bootstrap`.

Pull requests should describe scope, list affected packages, link related issues, and include verification commands run locally. Include screenshots or short recordings for frontend/UI changes.

## Agent-Specific Notes
Keep diffs focused, avoid editing generated `dist/` output, and validate changes with the smallest relevant command set before finishing.

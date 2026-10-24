# Session Progress Log

## Current State

**Last Updated:** 2026-10-24
**Active Feature:** feat-019 - Docker Hardening (F02 of `docs/plan/open-issues-roadmap.md`, items 28, 29, 30)
**Branch:** `feat/docker-hardening`
**Plan:** `docs/plan/docker-hardening-plan.md`; tasks: `docs/plan/open-issues-tasks.md`, F02

## Status

### Done

- [x] F02.S: PR #66 (feat-026 done, feat-019 `in_progress`, plan)
- [x] F02.1: baseline (below)
- [x] F02.2: `.dockerignore`
- [x] F02.3: canary checks
- [x] F02.4: system user `app` (uid 999, home `/home/app`), `COREPACK_HOME=/opt/corepack` readable by all, `USER app` after the `COPY`s
- [x] F02.5: `HEALTHCHECK` on `/api/ping`; **changed during verification:** it checks the body for `"status":"ok"`, because with `SERVE_STATIC=true` any unknown path returns `index.html` with 200 (SPA fallback) — a status-only check stayed `healthy` with `API_PATH_PREFIX=v1`
- [x] F02.6: `CMD ["node", "dist/index.js"]`, migrations as one-shot runs
- [x] F02.7: measurements after
- [x] F02.D: `documentation/backend/deployment.md` (Dockerfile, commands incl. one-shot migrations and Compose/Kubernetes notes, healthcheck override, verification, runtime, DB, checklist), root `README.md`; code-issues 28, 29, 30 fixed

## Evidence of Completion

`docker build --no-cache` (macOS, Docker Desktop):

|               | Before (`main`) | After                                                                 |
| ------------- | --------------- | --------------------------------------------------------------------- |
| Build context | 83.45 MB        | 124.7 kB                                                              |
| Build time    | 337 s           | 172 s                                                                 |
| Image size    | 813 MB          | 813 MB (dominated by Node and production deps; unchanged as expected) |

Secrets (canary marker written to a new root `.env` and `packages/shared/.env`, both removed afterwards; the existing local `.env` files were not touched):

- builder stage (`--target builder`): `grep -rl <marker> /` — nothing; `find /app -name .env` — nothing
- every layer of the final image (`docker save` + `grep` per layer) — nothing; no `.env` entries in any layer
- `docker history --no-trunc` — 0 matches
- positive controls with the same commands: `find` lists the three `.env.example` in the builder stage; `stopGracefully` is found in a layer; `docker history` shows `dist/index.js`

Runtime (disposable `pgvector/pgvector:pg16` and `redis:7-alpine` in a docker network):

- `docker run --rm … pnpm db:create:prod` → `Database "itvibe_f02" created successfully`, `Extension "vector" ensured`; `… pnpm db:migrate` → `migrations applied successfully` (as user `app`)
- app container: `id -u` → `999`, `id -un` → `app`; PID 1 is Node (process title `uwebsockets-api`); `healthy`; no migration lines in the startup log; `/api/ping` → `{"status":"ok"}`, `/` → 200 (static)
- `API_PATH_PREFIX=v1`, default healthcheck → container `running` but `unhealthy`; with `--health-cmd` on `/v1/ping` → `healthy`
- `docker stop -t 10` → log `stop SIGTERM`, `server stop type: SIGTERM`; stopped in 1 s; exit code 0, not OOM/killed
- First run without `APP_URL` failed fast with `SESSION_COOKIE_HOST_PREFIX=true requires APP_URL to use https://` — expected production config validation, not an image problem

Checks: `pnpm format:check` clean; `pnpm docs:build && pnpm docs:verify` passed. No application code changed.

## Files Modified

- new: `.dockerignore`, `docs/plan/docker-hardening-plan.md` (PR #66)
- updated: `Dockerfile`, `README.md`, `documentation/backend/deployment.md`, `docs/plan/code-issues-found-during-docs.md`, `docs/plan/open-issues-tasks.md`, `progress.md`

## Notes for Next Session

- Breaking change for deploys: migrations are no longer run by the container start.
- Next: F03 HTTP/WS Response Safety (feat-020).

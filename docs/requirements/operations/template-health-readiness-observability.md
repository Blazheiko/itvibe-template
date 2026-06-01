# Health, Readiness, and Observability Requirements: itvibe-template

Last updated: 2026-05-30

## 1. Logging and Error Monitoring

| ID      | Status              | Requirement                                                                                     |
| ------- | ------------------- | ----------------------------------------------------------------------------------------------- |
| OBS-001 | Implemented default | The backend uses structured logging for runtime events and errors.                              |
| OBS-002 | Implemented default | Backend Sentry integration can be enabled through environment configuration.                    |
| OBS-003 | Implemented default | Frontend Sentry integration can be enabled through `VITE_*` environment configuration.          |
| OBS-004 | Target              | Logs should include request/session correlation where available and should not include secrets. |

## 2. Health and Readiness

| ID             | Status          | Requirement                                                                                                                                                       |
| -------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OBS-HEALTH-001 | Extension point | The backend should expose a lightweight liveness endpoint that does not depend on external services.                                                              |
| OBS-HEALTH-002 | Extension point | The backend should expose a readiness endpoint that verifies required dependencies such as PostgreSQL and Redis.                                                  |
| OBS-HEALTH-003 | Extension point | Readiness should report optional dependency state for S3, SMTP, Sentry, and AI providers without failing the whole app unless the deployment marks them required. |
| OBS-HEALTH-004 | Extension point | Docker/Kubernetes deployments should wire liveness and readiness probes to these endpoints.                                                                       |

## 3. Metrics

| ID             | Status          | Requirement                                                                                                                                                                                      |
| -------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| OBS-METRIC-001 | Extension point | Production deployments should expose or export metrics for HTTP latency, HTTP error rate, WebSocket connections, WebSocket messages, auth throttles, AI token usage, and push delivery failures. |
| OBS-METRIC-002 | Extension point | Prometheus-compatible metrics are recommended, but the template does not mandate one metrics backend.                                                                                            |
| OBS-METRIC-003 | Target          | Sentry release/environment tags should match frontend and backend deployments for correlation.                                                                                                   |

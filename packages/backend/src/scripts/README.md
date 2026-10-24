# Backend scripts

| File                 | Run                                                                 | What it does                                                                                                                                                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `send-test-email.ts` | `pnpm --filter backend mail:test <recipient@example.com> [subject]` | Sends a test email through the configured mail driver (`emailService`) to check SMTP settings. Reads `packages/backend/.env`.                                                                                                                                                      |

Database scripts (`db:create`, `db:migrate`, `db:seed`, …) live in `src/db/` and are described in [Database](https://blazheiko.github.io/itvibe-template/backend/database).

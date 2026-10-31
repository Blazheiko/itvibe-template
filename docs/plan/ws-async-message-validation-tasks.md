# feat-049: task list

> До плану [`ws-async-message-validation-plan.md`](./ws-async-message-validation-plan.md). Гілка
> `feat/ws-async-message-validation`. Кожен пункт — окремий коміт, якщо не сказано інше.

## Етап 0. Підготовка

- [ ] **0.1** PR у `main`: план + цей task list; feat-049 → `in_progress`, опис оновити.
- [ ] **0.2** Гілка `feat/ws-async-message-validation`, `progress.md`, `session-handoff.md`.
- [ ] **0.3** `./init.sh` — typecheck/lint/test зелені.
- [ ] **0.4** `grep` усіх викликів `broadcastService.*` — список збігається з §2 плану.

## Етап 1. Реєстр подій (T1)

- [ ] **1.1** `shared/src/schemas/ws/broadcast-events.ts`: 5 схем, `BroadcastEventName`,
      `BroadcastPayload<E>`; експорт із `schemas/index.ts`.
- [ ] **1.2** `WSAdminUserOnlineUpsertPayloadSchema` — рішення §6 про `'+': 'reject'`.
- [ ] **1.3** `route-access.spec.ts`: охорони без морфів / `Date` / `bigint` / незадокументованих
      `unknown` проходять і по реєстру.

## Етап 2. Тести — RED (T2)

- [ ] **2.1** Типи: `@ts-expect-error` на неіснуючу подію та на payload іншої події.
- [ ] **2.2** Валідна подія відправляється всім з'єднанням.
- [ ] **2.3** Зайвий ключ: `log` — відправлено без нього, `warn`; `strict` — не відправлено.
- [ ] **2.4** Невідповідність схемі — не відправлено в обох режимах, `error` у лог.
- [ ] **2.5** Перевірка викликається один раз на подію, не на кожне з'єднання.
- [ ] **2.6** `broadcastMessageToChannel` — те саме для `server.publish`.

## Етап 3. `broadcastService` (T3)

- [ ] **3.1** Генеричні методи (§4.2).
- [ ] **3.2** Перевірка на подію один раз на старті (`createResponseCheck`), виклик до
      серіалізації (§4.3); невалідна — не відправляти (§4.4).
- [ ] **3.3** `ResponseCheckMeta.transport: 'broadcast'`.
- [ ] **3.4** Тести етапу 2 зелені.

## Етап 4. Виклики (T4)

- [ ] **4.1** `support-service.ts` (`broadcastToConnection`) — типізований `event` / `payload`.
- [ ] **4.2** `ws-presence-service.ts`.
- [ ] **4.3** `pnpm typecheck`, `pnpm --filter backend test`.

## Етап 5. Фронтенд (T5)

- [ ] **5.1** Inline-перевірки з `useBroadcastHandler.ts` → `utils/ws-payload-guards.ts`.
- [ ] **5.2** Тест паритету guard ↔ схема реєстру на фікстурах (§4.5).
- [ ] **5.3** `pnpm --filter frontend typecheck`, `pnpm --filter frontend test`; бандл без ArkType
      (`pnpm --filter frontend build`, перевірити, що чанки не містять рушія).

## Етап 6. Вартість (T6)

- [ ] **6.1** Заміряти перевірку `support_chat_token` і `admin_user_online_upsert` на подію →
      `progress.md`.

## Етап 7. Документація (T7)

- [ ] **7.1** `documentation/backend/websocket.md`: broadcast-події, реєстр, невалідна подія.
- [ ] **7.2** `documentation/backend/response-validation.md`: перевірка охоплює broadcast.
- [ ] **7.3** `documentation/shared/index.md`: реєстр подій; guard'и фронтенду й тест паритету.
- [ ] **7.4** `pnpm docs:build && pnpm docs:verify`.

## Етап 8. Definition of Done (T8)

- [ ] **8.1** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`.
- [ ] **8.2** `CI=1 pnpm --filter frontend test:e2e`.
- [ ] **8.3** Ручна перевірка (§5 T8 плану): `admin_user_online_upsert` приходить адміну; зайве поле
      в `log` вирізано, шлях у лозі.
- [ ] **8.4** Evidence у `progress.md`; PR гілки; feat-049 → `done` через PR у `main`.

# План: доступ до даних push (feat-022, F05)

Пункти 20, 21, 49 з [`code-issues-found-during-docs.md`](./code-issues-found-during-docs.md). Roadmap: [F05](./open-issues-roadmap.md); задачі: F05.1–F05.6 у [`open-issues-tasks.md`](./open-issues-tasks.md). Залежності: feat-021 (push-маршрути й guard'и), feat-036 (pg-тести).

## Вихідний стан (`main` після PR #59)

- `push-subscription-repository.ts` → `findByUserIdWithLogs`: підписки користувача за `createdAt desc`, потім **окремий запит на кожну** підписку: до 5 логів за `sentAt desc`, поля `id`, `messageTitle`, `status`, `sentAt` (N+1).
- `push-subscription-statistics-service.ts` імпортує `db` і читає **всі** логи підписки, а лічильники рахує в JS: `total`, `SENT`, `FAILED`, `PENDING`, `last7DaysCount` (`sentAt >= now - 7 днів`), `successRate = sent / total * 100` (або `0`).
- `push-notification-sender-service.ts` → `sendToUser` імпортує `db` і для кожної активної підписки **послідовно**: `webpush.sendNotification` → `db.insert(pushNotificationLogs)` → `pushSubscriptionRepository.update` (оновлює `lastUsedAt`); при помилці — `deactivate` для 410/404 і insert логу `FAILED`. Помилка insert'у після успішної відправки потрапляє в `catch` і рахується як `failed` з другим логом `FAILED`.
- Індекси `push_notifications_log`: `user_id`, `subscription_id`; на `sent_at` індексу немає.

## Контракти, які не змінюються

1. **`findByUserIdWithLogs`:** той самий тип `PushSubscriptionWithLogs[]`; порядок підписок `createdAt desc`; для кожної — до 5 найновіших логів за `sentAt desc` з тими самими чотирма полями; підписка без логів — `notificationLogs: []`. При однаковому `sentAt` порядок задається `id desc` (у старій реалізації він був невизначений; фікстура тесту має різні `sentAt`, щоб еталон був однозначним).
2. **`getPushSubscriptionStatistics`:** той самий тип `PushSubscriptionStatisticsResult` і ті самі значення. Межу 7 днів обчислює JS (`Date.now()`) і передає в SQL параметром, а не `now()` у БД: інакше годинник БД і застосунку дав би різні результати. `successRate` рахується в JS з тих самих цілих лічильників. Логи зі `status = NULL` враховуються лише в `total`, як і раніше.
3. **`sendToUser`:** той самий результат `{ sent, failed }`, той самий payload, та сама фільтрація за `notificationType`, деактивація при 410/404, один лог на підписку (`SENT` або `FAILED`) з власним `sentAt` на момент відповіді.

## Рішення

1. **Новий `push-notification-log-repository.ts`** (у barrel): `insertMany(rows)`, `countsBySubscription(subscriptionId, since)` → `{ total, sent, failed, pending, sinceCount }` одним запитом з `count(*) filter (where …)`, `latestBySubscriptionIds(ids, limit)`. Сервіси push більше не імпортують `#database/*`.
2. **N+1:** `findByUserIdWithLogs` = 2 запити: підписки + `latestBySubscriptionIds` через `row_number() over (partition by subscription_id order by sent_at desc, id desc) <= 5` з `inArray`. Групування в `Map` за `subscriptionId`, порядок підписок зберігається. Порожній список підписок — без другого запиту.
3. **Відправка:** паралельно з лімітом конкурентності `PUSH_SEND_CONCURRENCY = 5` (константа в сервісі; без нової залежності — невеликий helper `mapWithConcurrency`). Логи збираються в масив і пишуться **одним** `insertMany` після всіх відправок; `lastUsedAt` оновлюється одним `touchLastUsed(ids, userId)` для успішних підписок. Помилка запису логів більше не перетворює успішну відправку на `failed`: вона логується (`logger.error`), а результат `{ sent, failed }` відповідає фактичним відповідям push-сервісу.
4. **Тести:** pg-тести на інфраструктурі feat-036 (фікстура: 3 підписки з 7 / 2 / 0 логів; копія старої реалізації як еталон, deep-equal) + підрахунок запитів через лічильник на `pool.query`; unit-тести sender'а з моком `web-push` (максимум одночасних відправок = 5, один `insertMany`).
5. **Поза фічею:** підключення push до бізнес-подій (`skipIfOnline`, `notificationType`) — новий пункт у code-issues (F05.6).

## Кроки

| Крок | Зміст                                                        | Задача |
| ---- | ------------------------------------------------------------ | ------ |
| 1    | pg-фікстура й еталон старої `findByUserIdWithLogs`           | F05.1  |
| 2    | `findByUserIdWithLogs` у 2 запити                            | F05.2  |
| 3    | `push-notification-log-repository`                           | F05.3  |
| 4    | статистика через SQL-агрегати, без `db` у сервісі            | F05.4  |
| 5    | `sendToUser`: конкурентність 5, пакетний запис               | F05.5  |
| 6    | новий пункт code-issues про бізнес-події                     | F05.6  |
| 7    | документація: `mail-push.md`, `repositories-transformers.md` | F05.D  |

## Ризики

- **Зміна порядку побічних ефектів у `sendToUser`:** логи з'являються після всіх відправок, а не після кожної. Якщо процес упаде посеред відправки, логів не буде зовсім (раніше — частково). Прийнятно: це тестовий push-шлях (п. 49), а результат відправки повертається викликачу.
- **Паралельні відправки** до одного push-сервісу: ліміт 5 на виклик `sendToUser`.

# План: захист сховища (feat-023, F06)

Пункти 32, 44, 45, 46 з [`code-issues-found-during-docs.md`](./code-issues-found-during-docs.md). Roadmap: [F06](./open-issues-roadmap.md); задачі: F06.1–F06.5 у [`open-issues-tasks.md`](./open-issues-tasks.md). Рішення Р1: аватари з `publicRead`.

## Вихідний стан (`main` після PR #69)

- `vendor/utils/storage/s3.ts`: приватний `buildKey(key)` → `<S3_PREFIX>/<S3_DYNAMIC_DATA_PREFIX>/<key>` застосовують `uploadToS3`, `presignUrl`, `downloadFromS3`, а `deleteFromS3` — ні.
- Через це `avatar-service.ts` і `knowledge-base-service.ts` мають власні копії `buildFullS3Key` (5 викликів `deleteFromS3` і CDN URL скриншота в `knowledge-base-service.ts:382`).
- Тип файлу перевіряється лише за заголовком multipart (`file.type` ∈ {jpeg, png, webp}). Розширення аватара береться з імені файлу клієнта (`path.extname`), скриншота — з `file.type`.
- Аватар завантажується без `publicRead`, хоча фронтенд читає його напряму за CDN URL; скриншоти бази знань уже з `publicRead: true`.
- `corsS3.xml`: `AllowedOrigin *` з `GET`, `POST`, `PUT`, `AllowedHeader *`. Завантаження йдуть через бекенд, браузер лише читає.

## Рішення

1. **Один helper повного ключа:** `buildKey` експортується з `s3.ts` як `buildObjectKey`; `deleteFromS3(key)` приймає **відносний** ключ, як і решта функцій, і сам додає префікс. Обидві копії `buildFullS3Key` видаляються; CDN URL скриншота — `${cdnUrl}/${buildObjectKey(key)}`. Значення в БД (`users.avatar`, `support_knowledge_base.screenshot_key`) — відносні ключі, як і зараз, міграція не потрібна.
2. **Тип за вмістом:** `detectImageType(data)` у `vendor/utils/storage/detect-image-type.ts` за magic bytes повертає `image/jpeg` (`FF D8 FF`), `image/png` (`89 50 4E 47 0D 0A 1A 0A`), `image/webp` (`RIFF....WEBP`) або `undefined`. Сервіси приймають файл, лише коли виявлений тип входить у дозволений набір **і** збігається з заявленим `file.type`; інакше та сама відповідь, що й зараз для невалідного типу (`400 bad_request`, щоб не змінювати контракт помилки). `Content-Type` в S3 і розширення ключа беруться з виявленого типу; ім'я файлу клієнта більше не впливає на ключ.
3. **Р1:** `uploadToS3(…, { publicRead: true })` для аватарів, як для скриншотів.
4. **CORS:** `corsS3.xml` — `AllowedOrigin` з placeholder-доменом застосунку, лише `GET` і `HEAD`, `AllowedHeader` обмежено (`*` для GET без credentials не потрібен); `MaxAgeSeconds`. Окремий приклад для продакшну — `corsS3.prod.example.xml` з кількома доменами.

## Кроки

| Крок | Зміст                                                    | Задача |
| ---- | -------------------------------------------------------- | ------ |
| 1    | `buildObjectKey`, `deleteFromS3` з префіксом, без копій  | F06.1  |
| 2    | `detectImageType` + тести сигнатур                       | F06.2  |
| 3    | аватари й скриншоти перевіряють вміст, розширення з типу | F06.3  |
| 4    | аватари з `publicRead`                                   | F06.4  |
| 5    | `corsS3.xml` + prod-приклад                              | F06.5  |
| 6    | `storage.md`                                             | F06.D  |

## Ризики

- **Наявні об'єкти без `public-read`:** аватари, завантажені до цієї фічі, лишаться приватними. Якщо бакет не публічний цілком, їх треба перезалити або виставити ACL окремо (описати в `storage.md`).
- **Файли, що проходили лише за заголовком,** тепер відхиляються, якщо вміст не збігається. Це навмисно.

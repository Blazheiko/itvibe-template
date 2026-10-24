# План: кешування статики (feat-031, F14)

Пункти 39, 40, 41 з [`code-issues-found-during-docs.md`](./code-issues-found-during-docs.md). Roadmap: [F14](./open-issues-roadmap.md); задачі: F14.1–F14.4 у [`open-issues-tasks.md`](./open-issues-tasks.md).

## Вихідний стан (`main` після PR #81)

- `static-server.ts` на старті читає **весь** `public` у `Map` (без ліміту розміру) і реєструє маршрут на кожен файл; ETag — SHA1 вмісту.
- HTML: `public, max-age=0, must-revalidate`. Будь-який інший файл: `public, max-age=31536000, immutable` — зокрема `manifest.json`, `service-worker.js`, `favicon.svg`, `/icons/*`, `/audio/*`, хоча їхні імена не хешовані.
- `If-None-Match` порівнюється як рядок `=== etag`: список, `*` і `W/` не працюють.
- Стиснення немає (`// Note: Compression not implemented yet`).

## Рішення

1. **`Cache-Control` (п. 39):** `public, max-age=31536000, immutable` лише для `/assets/*` (Vite кладе туди файли з хешем у імені); решта — `no-cache` (кешувати можна, але щоразу перевіряти ETag). HTML — як зараз.
2. **`If-None-Match` (п. 40):** `matchesIfNoneMatch(header, etag)` за RFC 9110 §13.1.2: `*` збігається з будь-яким поточним представленням; список через кому; слабке порівняння (`W/"x"` = `"x"`).
3. **RAM і стиснення (п. 41):**
    - у пам'ять кладуться файли до `STATIC_MAX_MEMORY_FILE_SIZE` (default 1 MiB), поки сума не перевищить `STATIC_MAX_MEMORY_TOTAL` (default 64 MiB); решта віддається **стрімінгом з диска** (`fs.createReadStream` + backpressure uWS `tryEnd`/`onWritable`) з ETag за `size` + `mtime`;
    - стиснення робить сервер на старті, без змін у збірці фронтенду: для текстових типів (`html`, `js`, `mjs`, `css`, `svg`, `json`, `webmanifest`, `txt`, `xml`) понад 1 KiB у пам'яті зберігаються варіанти `br` і `gzip`, якщо вони менші за оригінал. Варіант обирається за `Accept-Encoding` (`br` → `gzip` → без стиснення) з `Vary: Accept-Encoding` і `Content-Encoding`. Стислі варіанти рахуються в ліміт пам'яті. **Відступ від roadmap:** там пропонувалися `.br`/`.gz` під час збірки фронтенду; стиснення на старті не потребує нових залежностей і працює з будь-яким вмістом `public`.

## Кроки

| Крок | Зміст                                                 | Задача |
| ---- | ----------------------------------------------------- | ------ |
| 1    | `Cache-Control` за шляхом                             | F14.1  |
| 2    | розбір `If-None-Match`                                | F14.2  |
| 3    | ліміти RAM і стрімінг з диска                         | F14.3  |
| 4    | `br` / `gzip` за `Accept-Encoding`                    | F14.4  |
| 5    | `caching-etag.md`, `configuration.md`, `.env.example` | F14.D  |

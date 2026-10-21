FROM ubuntu:24.04 AS builder
WORKDIR /app

# Устанавливаем Node.js 24 и необходимые инструменты
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Включаем corepack для использования pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Копируем файлы для установки зависимостей
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/shared/package.json ./packages/shared/
COPY packages/frontend/package.json ./packages/frontend/

# Устанавливаем зависимости
RUN pnpm install --frozen-lockfile

# Копируем весь проект
COPY . .

# Передаём Vite env в build stage до сборки frontend.
ARG VITE_SENTRY_DSN
ARG VITE_SENTRY_ENABLED
ARG VITE_SENTRY_ENVIRONMENT
ARG VITE_SENTRY_RELEASE
ARG VITE_SENTRY_TRACES_SAMPLE_RATE
ARG VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE
ARG VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE

ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN \
    VITE_SENTRY_ENABLED=$VITE_SENTRY_ENABLED \
    VITE_SENTRY_ENVIRONMENT=$VITE_SENTRY_ENVIRONMENT \
    VITE_SENTRY_RELEASE=$VITE_SENTRY_RELEASE \
    VITE_SENTRY_TRACES_SAMPLE_RATE=$VITE_SENTRY_TRACES_SAMPLE_RATE \
    VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE=$VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE \
    VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE=$VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE

# 1. Собираем shared (зависимость для frontend и backend)
RUN pnpm --filter shared build

# 2. Собираем frontend
RUN pnpm --filter frontend build

# 3. Собираем backend
RUN pnpm --filter backend build

# 4. Копируем собранный frontend в папку public backend
RUN rm -rf packages/backend/public && \
    cp -r packages/frontend/dist packages/backend/public


# --- Этап 2: продакшн ---
FROM ubuntu:24.04 AS production
WORKDIR /app

# Устанавливаем Node.js 24 и необходимые инструменты
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Включаем corepack для использования pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Копируем файлы для установки зависимостей
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/shared/package.json ./packages/shared/
COPY packages/frontend/package.json ./packages/frontend/

# Только production-зависимости: drizzle-kit (миграции) — в dependencies backend,
# create-database запускается из dist, поэтому tsx и прочие devDependencies не нужны
RUN pnpm install --frozen-lockfile --prod --filter backend...

ENV NODE_ENV=production \
    APP_ENV=production \
    SERVE_STATIC=true

# Копируем собранный код backend и shared
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Копируем public (frontend build) и public-test
COPY --from=builder /app/packages/backend/public ./packages/backend/public
COPY --from=builder /app/packages/backend/public-test ./packages/backend/public-test

# Копируем конфигурационные файлы для drizzle-kit
COPY --from=builder /app/packages/backend/drizzle.config.js ./packages/backend/drizzle.config.js
# Копируем миграции drizzle
COPY --from=builder /app/packages/backend/src/drizzle/migrations ./packages/backend/src/drizzle/migrations

# Копируем базу знаний поддержки
COPY --from=builder /app/docs/support-knowledge-base ./docs/support-knowledge-base

# Открываем порт 3000
EXPOSE 3000

# Запускаем миграции и приложение
WORKDIR /app/packages/backend
CMD ["sh", "-c", "node --version && pnpm db:create:prod && pnpm db:migrate && pnpm start"]

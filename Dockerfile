FROM node:22-bookworm-slim AS base
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates wget \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Зависимости ставятся только в образе, на хосте Node не нужен.
FROM base AS deps
COPY package.json package-lock.json* ./
COPY prisma ./prisma
# Без прокси + ретраи: иначе Docker Desktop/корпоративный HTTP_PROXY ломает registry.npmjs.org.
ENV HTTP_PROXY= HTTPS_PROXY= http_proxy= https_proxy= ALL_PROXY= all_proxy= \
    NO_PROXY=* no_proxy=* \
    npm_config_proxy= npm_config_https_proxy= \
    npm_config_registry=https://registry.npmjs.org/
RUN npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm install --no-audit --no-fund \
 && npx prisma generate

# Для разработки: код монтируется томом, см. docker-compose.dev.yml
FROM deps AS dev
ENV NODE_ENV=development
EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push --skip-generate && npx tsx prisma/seed.ts && npx next dev -H 0.0.0.0"]

FROM deps AS build
COPY . .
RUN npm run build

FROM base AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_URL=file:/data/mgtimo.db
COPY --from=build /app /app
RUN mkdir -p /data && chown -R node:node /data /app
USER node
EXPOSE 3000
# Схема и сид при старте: пользователи один раз, переносы пар от «сегодня».
# Слушает 0.0.0.0 внутри сети Compose; наружу публикует только nginx (deploy/).
CMD ["sh", "-c", "npx prisma db push --skip-generate && npx tsx prisma/seed.ts && npx next start -H 0.0.0.0"]

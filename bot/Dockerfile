# 1. Билд-стейдж
FROM node:20-alpine AS builder

WORKDIR /app

# Установить зависимости
COPY package*.json ./
RUN npm install

# Скопировать исходники
COPY tsconfig.json ./
COPY src ./src

# Собрать TypeScript в JS
RUN npx tsc

# 2. Рантайм-стейдж
FROM node:20-alpine

WORKDIR /app

# Установить только production-зависимости
COPY package*.json ./
RUN npm install --omit=dev

# Скопировать собранный код из builder
COPY --from=builder /app/dist ./dist

# Переменные окружения будут приходить из docker-compose
ENV NODE_ENV=production

CMD ["node", "dist/index.js"]

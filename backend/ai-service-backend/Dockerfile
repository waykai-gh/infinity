# 1. Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Ставим все зависимости (prod + dev)
COPY package*.json ./
RUN npm ci

# Исходники и tsconfig
COPY tsconfig.json ./
COPY src ./src

# Компилируем TS → JS
RUN ./node_modules/.bin/tsc

# 2. Runtime stage
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
# Только прод-зависимости
RUN npm ci --omit=dev

# Копируем собранный dist
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
CMD ["node", "dist/index.js"]

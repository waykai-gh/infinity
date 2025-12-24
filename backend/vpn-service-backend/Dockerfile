# 1. Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Зависимости (prod + dev)
COPY package*.json ./
RUN npm install

# Исходники и конфиг TS
COPY tsconfig.json ./
COPY src ./src

# Компиляция TS → JS (локальный tsc из node_modules)
RUN ./node_modules/.bin/tsc

# 2. Runtime stage
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
# Только продовые зависимости
RUN npm install --omit=dev

# Готовый JS-код
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
CMD ["node", "dist/index.js"]

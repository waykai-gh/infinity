FROM node:20-alpine
WORKDIR /app

# 1. Зависимости
COPY package*.json ./
RUN npm install

# 2. Исходники и tsconfig
COPY tsconfig.json ./
COPY src ./src

# 3. Компиляция TS → JS
RUN ./node_modules/.bin/tsc

# 4. Runtime
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]

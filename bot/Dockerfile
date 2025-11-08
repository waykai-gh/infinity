FROM node:20.5.0
WORKDIR /app

# Копируем только package files для кэширования
COPY package*.json ./

ENV NODE_ENV=development

# Используем npm install для dev (включая devDependencies)
RUN npm install

# Копируем tsconfig и исходники
COPY tsconfig.json ./
COPY src ./src

# Билдим для проверки, что всё компилируется
RUN npm run build

# Запускаем в dev режиме с hot-reload
CMD ["npm", "run", "dev"]
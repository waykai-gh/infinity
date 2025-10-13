# INfinity Project – Full Stack Development Plan (Planner)

## Background and Motivation
- Goal: Интегрировать нейросеть XOR (JavaScript) с Telegram ботом, используя Docker и PostgreSQL на выделенном сервере.
- Current State: Есть рабочий Telegram бот (src-bot) и нейросеть XOR (src-site/ai/ai scripts/aiScript.js).
- Outcome: Полнофункциональная система с AI-ботом, базой данных и контейнеризацией для продакшена.

## Key Challenges and Analysis
- **AI Integration**: Интеграция JavaScript нейросети XOR в TypeScript бот
- **Database Architecture**: PostgreSQL схема для хранения данных пользователей и результатов AI
- **Docker Multi-Container**: Бот + PostgreSQL + Nginx на выделенном сервере
- **AI Service Architecture**: Отдельный сервис для нейросети с API endpoints
- **Data Flow**: Telegram → Bot → AI Service → PostgreSQL → Response
- **Production Deployment**: Docker Compose для продакшена на выделенном сервере
- **Security**: API ключи, валидация входных данных для AI
- **Monitoring**: Логирование AI запросов, метрики производительности

## High-level Task Breakdown

### Phase 1: AI Service Integration
1) **Создание AI Service**
   - Конвертация JavaScript нейросети в TypeScript модуль
   - Создание AI API endpoints (/predict, /train)
   - Success: AI сервис отвечает на POST запросы с XOR данными

2) **Интеграция AI в Telegram Bot**
   - Добавление команд /xor, /predict в бота
   - Обработка пользовательского ввода для AI
   - Success: Бот может решать XOR задачи через команды

3) **PostgreSQL Database Setup**
   - Создание схемы для пользователей и AI результатов
   - Настройка Prisma ORM для работы с БД
   - Success: CRUD операции с пользователями и результатами AI

### Phase 2: Docker Multi-Container Setup
4) **Dockerfile для Telegram Bot**
   - Multi-stage build с TypeScript компиляцией
   - Оптимизация для Node.js приложения
   - Success: Образ бота < 150MB

5) **Dockerfile для AI Service**
   - Отдельный контейнер для нейросети
   - Express.js API сервер для AI
   - Success: AI сервис доступен на порту 3001

6) **Docker Compose для разработки**
   - Bot + AI Service + PostgreSQL + Nginx
   - Volume mapping для hot reload
   - Success: `docker-compose up` запускает полный стек

7) **Production Docker Compose**
   - Оптимизированная конфигурация для выделенного сервера
   - SSL termination, мониторинг
   - Success: Готово к деплою на выделенном сервере

### Phase 3: Database & API Integration
8) **PostgreSQL Schema Design**
   - Таблицы: users, ai_predictions, ai_training_sessions
   - Индексы для оптимизации запросов
   - Success: Миграции выполняются без ошибок

9) **API Endpoints для AI**
   - POST /api/ai/predict - предсказание XOR
   - POST /api/ai/train - обучение нейросети
   - GET /api/ai/history - история запросов пользователя
   - Success: AI API работает с базой данных

10) **Bot Commands Implementation**
    - /xor [input1] [input2] - решение XOR задачи
    - /train - переобучение нейросети
    - /stats - статистика использования
    - Success: Все команды работают через API

### Phase 4: Production Deployment
11) **Выделенный сервер setup**
    - Docker Compose для production
    - Nginx reverse proxy с SSL
    - Success: Сервисы доступны по HTTPS

12) **Monitoring & Logging**
    - Логирование AI запросов в PostgreSQL
    - Health checks для всех сервисов
    - Success: Мониторинг работает в реальном времени

13) **Security & Performance**
    - Rate limiting для AI API
    - Валидация входных данных
    - Success: Система защищена от атак

### Phase 5: Testing & Documentation
14) **Testing setup**
    - Unit тесты для AI функций
    - Integration тесты для API
    - Success: `npm test` проходит все тесты

15) **Documentation**
    - API documentation для AI endpoints
    - README с инструкциями по деплою
    - Success: Разработчик может развернуть систему по README

## Project Status Board

### Phase 1: AI Service Integration
- [ ] Создание AI Service
- [ ] Интеграция AI в Telegram Bot
- [ ] PostgreSQL Database Setup

### Phase 2: Docker Multi-Container Setup
- [ ] Dockerfile для Telegram Bot
- [ ] Dockerfile для AI Service
- [ ] Docker Compose для разработки
- [ ] Production Docker Compose

### Phase 3: Database & API Integration
- [ ] PostgreSQL Schema Design
- [ ] API Endpoints для AI
- [ ] Bot Commands Implementation

### Phase 4: Production Deployment
- [ ] Выделенный сервер setup
- [ ] Monitoring & Logging
- [ ] Security & Performance

### Phase 5: Testing & Documentation
- [ ] Testing setup
- [ ] Documentation

## 📋 Детальный список команд и файлов

### 🔧 Команды для развертывания

#### 1. Подготовка проекта
```bash
# Перейти в корень проекта
cd infinity-project

# Создать структуру папок
mkdir -p src-ai-service/{src,dist,tests}
mkdir -p docker/{dev,prod}
mkdir -p database/{migrations,seeds}

# Установка Docker (если не установлен)
# Ubuntu/Debian:
sudo apt update && sudo apt install docker.io docker-compose
# CentOS/RHEL:
sudo yum install docker docker-compose
```

#### 2. Настройка AI Service
```bash
cd src-ai-service
npm init -y
npm install express cors helmet morgan dotenv
npm install -D @types/node @types/express @types/cors typescript ts-node nodemon
npx tsc --init
```

#### 3. Настройка PostgreSQL
```bash
# Установка PostgreSQL (Ubuntu/Debian)
sudo apt install postgresql postgresql-contrib

# Создание базы данных
sudo -u postgres createdb infinity_ai_db
sudo -u postgres createuser infinity_user
sudo -u postgres psql -c "ALTER USER infinity_user PASSWORD 'your_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE infinity_ai_db TO infinity_user;"
```

#### 4. Docker команды
```bash
# Сборка всех образов
docker-compose -f docker/dev/docker-compose.yml build

# Запуск в режиме разработки
docker-compose -f docker/dev/docker-compose.yml up -d

# Запуск в продакшене
docker-compose -f docker/prod/docker-compose.yml up -d

# Просмотр логов
docker-compose logs -f ai-service
docker-compose logs -f telegram-bot
docker-compose logs -f postgres

# Остановка всех контейнеров
docker-compose down
```

### 📁 Файлы для создания

#### AI Service файлы:
1. **src-ai-service/package.json** - зависимости AI сервиса
2. **src-ai-service/tsconfig.json** - конфигурация TypeScript
3. **src-ai-service/src/server.ts** - Express сервер для AI API
4. **src-ai-service/src/neuralNetwork.ts** - конвертированная нейросеть XOR
5. **src-ai-service/src/routes/ai.ts** - AI API endpoints
6. **src-ai-service/src/middleware/validation.ts** - валидация входных данных
7. **src-ai-service/src/types/ai.ts** - TypeScript типы для AI

#### Telegram Bot файлы (обновленные):
8. **src-bot/src/commands/xor.ts** - команда /xor
9. **src-bot/src/commands/train.ts** - команда /train
10. **src-bot/src/commands/stats.ts** - команда /stats
11. **src-bot/src/services/aiService.ts** - клиент для AI API
12. **src-bot/src/database/connection.ts** - подключение к PostgreSQL
13. **src-bot/src/models/User.ts** - модель пользователя
14. **src-bot/src/models/Prediction.ts** - модель предсказаний AI

#### Docker файлы:
15. **docker/dev/docker-compose.yml** - для разработки
16. **docker/prod/docker-compose.yml** - для продакшена
17. **docker/dev/Dockerfile.bot** - образ Telegram бота
18. **docker/dev/Dockerfile.ai** - образ AI сервиса
19. **docker/prod/nginx.conf** - конфигурация Nginx
20. **.dockerignore** - исключения для Docker

#### Database файлы:
21. **database/schema.sql** - SQL схема PostgreSQL
22. **database/migrations/001_init.sql** - миграции
23. **database/seeds/users.sql** - тестовые данные

#### Environment файлы:
24. **.env.example** - пример переменных окружения
25. **docker/dev/.env** - переменные для разработки
26. **docker/prod/.env** - переменные для продакшена

#### Documentation:
27. **README.md** - документация проекта
28. **API.md** - документация AI API
29. **DEPLOYMENT.md** - инструкции по деплою на выделенный сервер

### 🗂️ Структура проекта после развертывания:
```
infinity-project/
├── src-bot/                    # Telegram Bot
│   ├── src/
│   │   ├── mainIndex.ts
│   │   ├── commands/           # Bot команды
│   │   │   ├── xor.ts
│   │   │   ├── train.ts
│   │   │   └── stats.ts
│   │   ├── services/           # Внешние сервисы
│   │   │   └── aiService.ts
│   │   ├── database/          # База данных
│   │   │   └── connection.ts
│   │   ├── models/            # Модели данных
│   │   │   ├── User.ts
│   │   │   └── Prediction.ts
│   │   └── types/
│   ├── dist/                   # Скомпилированный JS
│   ├── package.json
│   └── tsconfig.json
├── src-ai-service/            # AI Service
│   ├── src/
│   │   ├── server.ts          # Express сервер
│   │   ├── neuralNetwork.ts   # Нейросеть XOR
│   │   ├── routes/
│   │   │   └── ai.ts
│   │   ├── middleware/
│   │   │   └── validation.ts
│   │   └── types/
│   │       └── ai.ts
│   ├── dist/
│   ├── package.json
│   └── tsconfig.json
├── src-site/                   # Frontend (существующий)
├── docker/                     # Docker конфигурации
│   ├── dev/
│   │   ├── docker-compose.yml
│   │   ├── Dockerfile.bot
│   │   └── Dockerfile.ai
│   └── prod/
│       ├── docker-compose.yml
│       └── nginx.conf
├── database/                   # База данных
│   ├── schema.sql
│   ├── migrations/
│   └── seeds/
├── docs/                       # Документация
│   ├── API.md
│   └── DEPLOYMENT.md
├── README.md
└── .gitignore
```

## Current Status / Progress Tracking
- Режим: **Planner**
- Готово: Создан детальный план интеграции нейросети XOR с Telegram ботом
- Архитектура: Multi-container система с Docker, PostgreSQL и выделенным сервером
- Следующее: Переход в режим Executor для реализации плана

## Executor's Feedback or Assistance Requests
- ✅ **ПЛАН ГОТОВ**: Полный план интеграции AI с ботом создан
- 📋 **СТРУКТУРА**: Определена архитектура из 3 сервисов (Bot + AI + PostgreSQL)
- 🐳 **DOCKER**: Multi-container setup для разработки и продакшена
- 🗄️ **DATABASE**: PostgreSQL схема для пользователей и AI результатов
- 🚀 **DEPLOYMENT**: Готовность к деплою на выделенный сервер
- ⚠️ **ТРЕБУЕТСЯ**: Подтверждение для перехода в режим Executor

## Lessons
- **AI Integration**: JavaScript нейросети легко интегрируются в TypeScript через модульную архитектуру
- **Microservices**: Разделение AI сервиса и Telegram бота улучшает масштабируемость и тестируемость
- **PostgreSQL**: Реляционная БД идеальна для хранения структурированных данных пользователей и AI результатов
- **Docker Multi-Container**: Позволяет независимо масштабировать компоненты системы
- **TypeScript**: Строгая типизация критически важна для AI API и предотвращает ошибки в вычислениях
- **Environment Variables**: Безопасное хранение токенов ботов и ключей БД через .env файлы


# Справочник Infinity — Быстрые ссылки и команды

> **Для нетерпеливых разработчиков и DevOps**

---

## ⚡ Быстрые команды

### Локальная разработка

```bash
# Полная система (Docker Compose)
docker-compose up --build

# Отдельные компоненты
cd bot && npm run dev              # основной бот (с watch mode)
cd xor-bot && npm run dev          # AI бот
cd backend/ai-service-backend && npm start  # AI API

# Сборка без запуска
npm run build
```

### Production (ssh на mySrv)

```bash
# Обновление кода
cd infinity && git pull origin main

# Запуск/перезапуск
docker-compose up -d               # фон
docker-compose up                  # интерактивный режим

# Остановка
docker-compose down

# Обновление образов
docker-compose up -d --build
```

### Диагностика

```bash
# Статус контейнеров
docker-compose ps

# Логи всего
docker-compose logs -f

# Логи одного сервиса
docker-compose logs -f bot
docker-compose logs -f ai-service-backend

# Проверка портов
netstat -tlnp | grep LISTEN

# Проверка процессов
ps aux | grep xray
ps aux | grep node
```

### Управление Xray API

```bash
# Получить список пользователей
curl -H "X-Admin-Token: YOUR_TOKEN" http://localhost:3001/api/xray/users

# Добавить пользователя
curl -X POST http://localhost:3001/api/xray/users \
  -H "X-Admin-Token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"uuid":"test-uuid","email":"user@example.com"}'

# Получить статистику
curl -H "X-Admin-Token: YOUR_TOKEN" \
  http://localhost:3001/api/xray/users/user@example.com/stats

# Удалить пользователя
curl -X DELETE \
  -H "X-Admin-Token: YOUR_TOKEN" \
  http://localhost:3001/api/xray/users/user@example.com
```

---

## 🔗 Основные URL и порты

| Сервис | Локальный URL | Production |
|--------|---------------|-----------|
| **Основной бот** | Telegram (@...main) | Telegram (@...main) |
| **XOR бот** | Telegram (@infinityXorAi_bot) | Telegram (@infinityXorAi_bot) |
| **HTTP API** | `http://localhost:3001` | `http://62.181.44.4:3001` |
| **AI API** | `http://localhost:3000` | `http://ai-service-backend:3000` (в Docker) |
| **Ollama** | `http://localhost:11434` | `http://ollama:11434` (в Docker) |
| **Xray (VLESS)** | Не доступен локально | `141.164.45.6:8443` и другие |
| **Xray API** | `127.0.0.1:10085` (локально) | `127.0.0.1:10085` (внутри контейнера) |

---

## 📁 Ключевые файлы проекта

```
bot/
├── src/index.ts                  ← точка входа бота
├── src/commands/                 ← команды (/start, /profile и т.д.)
├── src/services/xray-service/
│   ├── xrayService.ts           ← функции управления Xray
│   ├── xtlsClient.ts            ← gRPC клиент для Xray
│   └── xrayRoutes.ts            ← HTTP маршруты API
└── package.json

xor-bot/
├── src/index.ts                  ← точка входа AI бота
├── src/ai-files/
│   └── xor.ts                   ← тестирование XOR
└── package.json

backend/ai-service-backend/
├── src/index.ts                  ← Express сервер
├── src/neuralNetwork.ts         ← SimpleNN реализация
└── package.json

docker-compose.yml               ← оркестрация сервисов
.env                             ← переменные окружения (НЕ коммитить!)
```

---

## 🔑 Переменные окружения

### bot/.env
```
BOT_TOKEN=<telegram-token>
HTTP_PORT=3001
XRAY_API_HOST=127.0.0.1
XRAY_API_PORT=10085
XRAY_ADMIN_TOKEN=<secret-admin-token>
XRAY_INBOUND_TAG=vless-inbound
```

### xor-bot/.env
```
BOT_XOR_TOKEN=<telegram-token>
AI_BASE_URL=http://ai-service-backend:3000
```

### backend/ai-service-backend/.env
```
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=gemma:7b
```

---

## 🛠️ Частые операции

### Добавить нового пользователя в VPN

```bash
# 1. Генерируем UUID и ShortID
UUID=$(uuidgen)
SHORT_ID=$(openssl rand -hex 8)

# 2. Добавляем в Xray
curl -X POST http://localhost:3001/api/xray/users \
  -H "X-Admin-Token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"uuid\":\"$UUID\",\"email\":\"newuser@example.com\"}"

# 3. Генерируем VLESS ссылку
curl -X POST http://localhost:3001/api/xray/vless-link \
  -H "X-Admin-Token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "uuid":"'$UUID'",
    "serverIp":"141.164.45.6",
    "serverPort":8443,
    "sni":"pass.itinerariummentis.org",
    "publicKey":"<your-public-key>",
    "shortId":"'$SHORT_ID'",
    "locationName":"Korea",
    "locationFlag":"🇰🇷"
  }'

# 4. Отправляем VLESS ссылку пользователю
```

### Получить статистику трафика

```bash
curl -H "X-Admin-Token: YOUR_TOKEN" \
  http://localhost:3001/api/xray/users/user@example.com/stats

# Ответ: { email, stats: { uplink, downlink } }
```

### Обновить код и перезапустить

```bash
cd infinity
git status                      # проверяем статус
git add .
git commit -m "my changes"
git push origin main            # отправляем на GitHub

# На сервере:
cd infinity
git pull origin main
docker-compose up -d --build    # пересобираем образы
```

---

## 🚨 Критические ошибки и решения

| Ошибка | Причина | Решение |
|--------|---------|----------|
| "409 Conflict: another user already running the bot" | Бот уже запущен в другом месте | Остановить другой процесс или использовать другой токен |
| "Failed to connect to Xray API" | Xray не запущен или port 10085 закрыт | Проверить `docker-compose ps`, `docker-compose logs xray` |
| "OLLAMA_BASE_URL is not accessible" | Ollama не доступна | Убедиться что `docker-compose up` включает ollama сервис |
| "Cannot find module 'uuid'" | Не установлены зависимости | `npm install` в папке проекта |
| "EADDRINUSE: address already in use :::3000" | Порт 3000 занят | `lsof -i :3000` и `kill -9 <PID>` или выбрать другой порт |

---

## 📊 Структура данных

### VLESS-ссылка

```
vless://UUID@IP:PORT?
  encryption=none&
  security=reality&
  fp=chrome&
  pbk=PUBLIC_KEY&
  sni=DOMAIN&
  sid=SHORT_ID&
  type=tcp&
  flow=xtls-rprx-vision
  #NAME
```

### Xray пользователь

```json
{
  "uuid": "befcba3b-abdb-49e0-b49c-2328d1ef9f4e",
  "email": "user@example.com",
  "level": 0,
  "uplink": 1234567,
  "downlink": 7654321
}
```

### Ответ AI API

```json
{
  "model": "gemma:7b",
  "response": "Ответ от ИИ"
}
```

---

## 📞 Когда что искать

| Вопрос | Документ | Раздел |
|--------|----------|--------|
| "Как развернуть с нуля?" | INFRASTRUCTURE.md | Быстрый старт + Развёртывание |
| "Как работает VLESS+Reality?" | VPN_XRAY_GUIDE.md | Понимание VLESS+Reality |
| "Как написать новую команду в боте?" | BOT_DEVELOPMENT.md | Разработка команд |
| "Как интегрировать новую модель Ollama?" | AI_SERVICE_README.md | Настройка моделей |
| "Какие сервера у нас есть?" | INFRASTRUCTURE.md | Инфраструктура и серверы |
| "Что проверить перед production?" | DEPLOYMENT_CHECKLIST.md | Вся документация |

---

## ✅ Перед коммитом в main

```bash
# 1. Убедиться что код работает локально
docker-compose up --build

# 2. Проверить логи на ошибки
docker-compose logs

# 3. Не коммитить .env файлы
git status  # убедиться что нет .env

# 4. Написать понятное сообщение коммита
git commit -m "feat: add user management for VPN"
# или
git commit -m "fix: handle Xray API timeout"
# или
git commit -m "docs: update INFRASTRUCTURE.md"

# 5. Отправить в GitHub
git push origin main
```

---

## 🔐 Безопасность

**НИКОГДА не коммитить в Git:**
- `.env` файлы
- Приватные ключи
- API токены
- Пароли

**НИКОГДА не показывать публично:**
- XRAY_ADMIN_TOKEN
- Xray PrivateKey
- Telegram токены
- Database пароли

**Где хранить секреты:**
- На сервере в `/home/user/.env` или похожем защищённом месте
- В переменных окружения контейнера
- В защищённом хранилище (vault, secrets manager и т.д.)

---

## 📈 Масштабирование (будущее)

**Сейчас:**
- Один сервер (mySrv)
- Один экземпляр каждого бота
- Нет load balancing

**Для масштабирования понадобится:**
- Kubernetes или swarm для оркестрации
- Redis для кеширования и сессий
- PostgreSQL для персистентных данных
- Load balancer (Nginx, HAProxy)
- Несколько VPN серверов с синхронизацией

---

**Последнее обновление:** 3 января 2026  
**Версия:** 1.0

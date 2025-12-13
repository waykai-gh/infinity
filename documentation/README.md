Обзор репозитория
.cursor/, .git/, .vscode/: служебные каталоги Cursor/VSCode и Git; содержат историю, рабочие заметки и конфиги редактора.
documentation/: заготовки будущих текстов (README.md, vpn-docs/*, xor-docs/*) — пока пустые файлы, под них надо будет расписать API/DEPLOY/security.
bot/: TypeScript-бот для Telegram, ориентирован на главное меню сервиса (услуги, профиль, подписка). Содержит исходники (src/), скомпилированные dist/, Dockerfile и package*.json.
xor-bot/: второй бот, который общается с AI-сервисом; структура зеркальна bot/, но логика завязана на HTTP-вызовы API.
backend/ai-service-backend/: Express-приложение с подключением к Ollama и локальной нейросетью XOR; есть Dockerfile, tsconfig и dist-билд.
backend/vpn-service-backend/: пустой каталог-заготовка под будущий VPN-бэкенд.
site/: статический фронтенд (страницы main/AI/convert/VPN, стили, скрипты, изображения).
Корневые файлы: docker-compose.yml (оркестрация всех контейнеров + Ollama), .dockerignore, .gitignore. node_modules/ на уровне корня — результат локальной установки зависимостей.
Telegram-бот bot/
Назначение: приветствие пользователя, меню услуг, раздел профиль/подписка/поддержка; пока без фактических VPN/подписок. БД-модели в src/databaseInBot/models/* пустые, миграции не реализованы.
Стек: TypeScript + grammy, @grammyjs/hydrate; dev-запуск через nodemon --exec tsx.
Скрипты (package.json): npm run dev — запуск src/index.ts в watch-режиме, npm run build — tsc, npm run start:prod — node dist/index.js.
Точка входа src/index.ts: поднимает Bot<MyContext> из grammy, настраивает inline‑клавиатуры, обрабатывает /start (ответ «Вы успешно зарегистрированы!») и callback-кнопки (services, profile, vpn, subscrice, help, back). Ошибки ловятся через bot.catch.
Команды:
services/vpn-service/vpnCommands.ts, commands/subcrise.ts, services/help.ts — пока отвечают статичными текстами «Пока недоступно…» или «Напишите ваше обращение…».
commands/profile.ts возвращает имя/ID пользователя.
Типы: types.ts лишь расширяет grammy Context с HydrateFlavor.
Dockerfile: образ node:20.5.0, установка зависимостей (включая dev), копирование src/, прогон npm run build, запуск npm run dev (то есть контейнер ориентирован на hot-reload).
ENV: обязательно BOT_TOKEN; в перспективе понадобятся DB_*, но сейчас код к БД не подключается.
Telegram-бот xor-bot/
Назначение: чат с ИИ (Gemma/Qwen) и демонстрация XOR-предсказаний через AI-бэкенд.
Стек/скрипты: аналог bot/, но зависимости включают express, node-fetch и больше dev‑инструментов (ts-node, tsx).
Точка входа src/index.ts:
Требует BOT_XOR_TOKEN и AI_BASE_URL.
/start пишет приветствие.
bot.on('message:text') пересылает текст в POST {AI_BASE_URL}/api/llm, передавая prompt. Ответ (response) отправляется пользователю; ошибки логируются и возвращается сообщение «произошла ошибка».
Дополнительные файлы:
src/ai-files/xor.ts — отдельный обработчик для тестового эндпоинта /api/xor-predict.
src/ai-files/aiMainCommands.ts — заготовка callback-команды.
Dockerfile: идентичен bot/ (dev-режим внутри контейнера).
ENV: BOT_XOR_TOKEN, AI_BASE_URL (обычно http://ai-service-backend:3000 внутри docker-сети).
AI-сервис backend/ai-service-backend/
Назначение: единая точка для запросов к локальной Ollama и маленькой нейросети XOR.
Скрипты: npm run build → tsc, npm start → node dist/index.js. Dockerfile билдит и запускает прод-режим на Node 20.
ENV:
OLLAMA_BASE_URL (например, http://ollama:11434 в Compose или http://host.docker.internal:11434 локально).
OLLAMA_MODEL (по умолчанию Qwen/Gemma; управляет моделью генерации).
API:
GET /health/ollama — проверяет OLLAMA_BASE_URL/api/tags; возвращает {ok: true, models:[...]} либо 503.
POST /api/llm — проксирует prompt (и опционально model, options) в Ollama /api/generate со stream: false; выдаёт JSON { model, response } или ошибки ollama_bad_gateway / ollama_unavailable.
POST /api/xor-predict — использует заранее обученную SimpleNN (2 входа, 4 скрытых, 1 выход) для XOR; ожидает x: [number, number], возвращает {result}.
Код нейросети: src/neuralNetwork.ts содержит реализацию полносвязной сети с сигмоидой, backprop и SGD; при старте тренирует на стандартных XOR-данных (5000 эпох, lr=0.8).
HTTP-клиент: используется глобальный fetch Node 20 (import не нужен). Обработка ошибок минимальна, таймауты не заданы.
VPN-бэкенд
Каталог backend/vpn-service-backend/ пустой; это резерв для будущего сервиса (нет package.json, кода, Dockerfile).
Статический сайт site/
Общая структура:
main/ — главная страница с навигацией на разделы AI/конвертер/VPN, подключает css/style.css, components/navbar.css, script.js.
ai/, vpn/, convert/ — тематические подпроекты; каждая страница повторно подключает navbar.css.
img/ содержит infinityLogo.png.
AI-раздел:
ai.html пока лишь отрисовывает навигацию и подключает ai scripts/aiScript.js.
aiScript.js — полноценная реализация простейшей XOR‑нейросети (как обучающий пример) для запуска в браузере; логика аналогична серверной версии.
Конвертер:
convert.html описывает интерфейс оффлайн-конвертера JPG→TIFF.
convert scripts/convertScript.js реализует drag&drop, очередь файлов, конвертацию через Canvas + UTIF.js, скачивание результатов. Локальный UTIF.js лежит в convert scripts/component convert scripts/.
CSS разбит на общий файл и компонентные стили.
VPN-страница: пока каркас без логики (vpn.html + стили vpn styles/vpnStyle.css).
Назначение: можно деплоить статически (GitHub Pages, Nginx); сборки нет — достаточно сервить содержимое каталога.
Документация внутри репозитория
documentation/README.md, documentation/vpn-docs/*, documentation/xor-docs/* — пустые placeholders под будущие материалы (API, DEPLOY, security).
В .cursor/documentation/... также присутствуют заглушки (по одной строке) — судя по истории, они служат быстрыми заметками в IDE.
Docker Compose и инфраструктура
Файл docker-compose.yml поднимает 4 сервиса и том ollama:
ollama: официальный образ ollama/ollama:latest, том /root/.ollama, healthcheck curl http://localhost:11434/api/tags, порт не проброшен наружу.
ai-service-backend: билд из backend/ai-service-backend, env-файл ./backend/ai-service-backend/.env, depends_on: ollama, подключен к app-network, restart: unless-stopped.
bot: билд из ./bot, env ./bot/.env, в той же сети, restart: unless-stopped.
xor-bot: билд из ./xor-bot, env ./xor-bot/.env, зависит от ai-service-backend.
Все сервисы используют build.network: host (Docker BuildKit обращается к сети хоста), а контейнеры работают в общей пользовательской сети app-network.
Обязательные env-файлы (нужно создать вручную):
bot/.env: BOT_TOKEN=... (+ будущие DB_*).
xor-bot/.env: BOT_XOR_TOKEN=..., AI_BASE_URL=http://ai-service-backend:3000 (или публичный URL, если вынесено наружу).
backend/ai-service-backend/.env: OLLAMA_BASE_URL=http://ollama:11434, OLLAMA_MODEL=gemma:7b (или нужная модель). При использовании внешней Ollama/url заменить.
Compose не содержит Postgres или других баз данных; несмотря на упоминание в scratchpad, интеграция ещё не сделана.
Запуск: docker compose up --build в корне; боты используют long polling, поэтому проброс портов не требуется, достаточно исходящего доступа к Telegram.
Локальная разработка без Docker
bot/ и xor-bot/: npm install, затем npm run dev (нужны Node 20.x и .env). Для prod — npm run build && npm run start:prod.
backend/ai-service-backend/: npm install, npm run build, npm start; Ollama должна быть доступна по OLLAMA_BASE_URL.
Статический сайт: открыть соответствующие HTML-файлы или обслуживать через любой HTTP-сервер (npx serve site).
Настройки и переменные окружения
Сервис	Обязательные переменные	Описание
bot	BOT_TOKEN	Telegram токен основного бота.
xor-bot	BOT_XOR_TOKEN, AI_BASE_URL	Токен второго бота, URL AI API (обычно http://ai-service-backend:3000).
ai-service-backend	OLLAMA_BASE_URL, OLLAMA_MODEL	Путь к Ollama API и модель по умолчанию.
(будущее) Postgres	DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME	Пока не используются в коде, но предусмотрены планом.

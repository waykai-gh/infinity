# VPN Bot Implementation Guide

## Содержание

1. [Обзор проекта](#обзор-проекта)
2. [Архитектура](#архитектура)
3. [База данных](#база-данных)
4. [Основные компоненты](#основные-компоненты)
5. [Процесс разработки](#процесс-разработки)
6. [Ошибки и решения](#ошибки-и-решения)
7. [Тестирование](#тестирование)
8. [Развёртывание](#развёртывание)

---

## Обзор проекта

**Цель:** Создать Telegram-бота, который выдаёт VPN ключи пользователям на основе их тарифного плана (`free` или `premium`).

**Основные компоненты:**
- **Telegram Bot** на TypeScript (Node.js, grammY)
- **PostgreSQL база данных** с таблицами пользователей, серверов и ключей
- **Xray VPN сервер** с поддержкой VLESS + TCP + REALITY
- **VPN сервис** для генерации ключей на основе плана пользователя

**Стек технологий:**
- Node.js + TypeScript
- grammY (Telegram Bot API)
- PostgreSQL
- Xray-core
- nodemon для разработки

---

## Архитектура

### Общая схема

```
Telegram User
    ↓
Telegram Bot (grammY)
    ↓
VPN Service (генерация ключей)
    ↓
PostgreSQL Database
    ├── User (пользователи)
    ├── Server (VPN серверы)
    └── VpnKey (выданные ключи)
    ↓
Xray VPN Servers
```

### Процесс получения ключа

1. Пользователь отправляет команду `/start` боту.
2. Бот проверяет/создаёт пользователя в БД.
3. Бот выбирает подходящий сервер.
4. VPN сервис генерирует HTTPS ссылку-подписку.
5. Ссылка сохраняется в `VpnKey` таблицу.
6. Бот отправляет ссылку пользователю.

---

## База данных

### Таблица User

```sql
CREATE TABLE "User" (
    id SERIAL PRIMARY KEY,
    "telegramId" BIGINT UNIQUE NOT NULL,
    username VARCHAR(255),
    plan VARCHAR(50) DEFAULT 'free' NOT NULL,
    status VARCHAR(50) DEFAULT 'active' NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Поля:**
- `telegramId` — Telegram ID пользователя (уникален)
- `plan` — тарифный план (`free` или `premium`)
- `status` — статус аккаунта (`active`, `banned` и т.п.)

**ВАЖНО:** UNIQUE constraint на `telegramId` предотвращает дубли при автоматическом создании.

### Таблица Server

```sql
CREATE TABLE "Server" (
    id SERIAL PRIMARY KEY,
    hostname VARCHAR(255) NOT NULL,
    ip VARCHAR(255) NOT NULL,
    location VARCHAR(100),
    port INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'active' NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Поля:**
- `hostname` — имя сервера (например, `kz-vpn-01`)
- `ip` — реальный IP адрес VPN сервера
- `port` — порт, на котором слушает Xray (например, 8443)
- `status` — статус сервера (`active`, `maintenance` и т.п.)

**Примечание:** Изначально пробовали использовать `portFree` и `portPremium`, но потом унифицировали на один `port` для всех. Разница между планами — в SNI и лимитах.

### Таблица VpnKey

```sql
CREATE TABLE "VpnKey" (
    id SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    "serverId" INTEGER NOT NULL REFERENCES "Server"(id) ON DELETE CASCADE,
    uuid VARCHAR(255) NOT NULL,
    "shortId" VARCHAR(255),
    sni VARCHAR(255),
    port INTEGER NOT NULL,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP
);
```

**Поля:**
- `userId`, `serverId` — связи на таблицы User и Server
- `uuid` — UUID ключа (уникальный идентификатор клиента)
- `shortId` — короткий ID для VLESS (используется Xray)
- `sni` — Server Name Indication (для маскировки трафика, например `aikyn.kz`, `github.com`)
- `port` — порт VPN ключа (для ключей одного сервера может быть одинаков)
- `isActive` — активен ли ключ
- `expiresAt` — дата истечения (опционально)

---

## Основные компоненты

### 1. VPN Service (`src/services/vpn-service/vpnService.ts`)

Основной сервис для генерации VLESS ссылок.

```typescript
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { pool } from '../db/db';

export class VpnService {
  static async createKeyForUser(telegramId: number) {
    const client = await pool.connect();
    try {
      // 1. Получить пользователя
      const user = await this.getUserByTelegramId(telegramId, client);
      if (!user) throw new Error('User not found');

      // 2. Выбрать сервер (желательно по плану)
      const server = await this.getServerByStatus('active', client);
      if (!server) throw new Error('No active servers');

      // 3. Генерить UUID и shortId
      const uuid = uuidv4();
      const shortId = crypto.randomBytes(8).toString('hex');

      // 4. Выбрать SNI по плану пользователя
      const sni = user.plan === 'premium' ? 'github.com' : 'aikyn.kz';

      // 5. Вставить в БД
      const port = server.port;
      await client.query(
        `INSERT INTO "VpnKey"
         ("userId", "serverId", uuid, "shortId", sni, port)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [user.id, server.id, uuid, shortId, sni, port],
      );

      // 6. Сформировать VLESS ссылку
      const vlessUrl = this.buildVlessUrl({
        uuid,
        server: server.ip,
        port,
        sni,
      });

      return vlessUrl;
    } finally {
      client.release();
    }
  }

  private static buildVlessUrl(params: {
    uuid: string;
    server: string;
    port: number;
    sni: string;
  }): string {
    const { uuid, server, port, sni } = params;
    return (
      `vless://${uuid}@${server}:${port}` +
      `?encryption=none&security=reality&sni=${sni}&fp=chrome&pbk=PUBLIC_KEY` +
      `&flow=xtls-rprx-vision#VPN`
    );
  }

  private static async getUserByTelegramId(
    telegramId: number,
    client: any,
  ) {
    const { rows } = await client.query(
      `SELECT * FROM "User" WHERE "telegramId" = $1`,
      [telegramId],
    );
    return rows[0] || null;
  }

  private static async getServerByStatus(
    status: string,
    client: any,
  ) {
    const { rows } = await client.query(
      `SELECT * FROM "Server" WHERE status = $1 LIMIT 1`,
      [status],
    );
    return rows[0] || null;
  }
}
```

**Ключевые моменты:**
- Использует одну БД транзакцию для безопасности.
- Генерирует UUID и shortId случайно.
- Выбирает SNI по плану пользователя.
- Формирует VLESS URL с параметрами подключения.

### 2. User Service (`src/services/user-service/userService.ts`)

Сервис для работы с пользователями (поиск/создание).

```typescript
import { pool } from '../db/db';

export class UserService {
  static async findOrCreateByTelegram(
    telegramId: number,
    username?: string,
  ) {
    const client = await pool.connect();
    try {
      // 1. Ищем существующего пользователя
      const { rows } = await client.query(
        `SELECT * FROM "User" WHERE "telegramId" = $1`,
        [telegramId],
      );

      if (rows.length > 0) return rows[0];

      // 2. Создаём нового пользователя (по умолчанию план free)
      const insert = await client.query(
        `INSERT INTO "User" ("telegramId", username, plan, status)
         VALUES ($1, $2, 'free', 'active')
         RETURNING *`,
        [telegramId, username ?? null],
      );

      return insert.rows[0];
    } finally {
      client.release();
    }
  }
}
```

**Что происходит:**
1. Проверяет, есть ли уже пользователь с таким `telegramId`.
2. Если да — возвращает его.
3. Если нет — создаёт нового с планом `free` и статусом `active`.

Благодаря `UNIQUE` constraint на `telegramId`, даже если кто-то нажмёт `/start` дважды, не будет ошибок.

### 3. Bot Commands (`src/commands/vpnCommands.ts`)

Команды, которые отвечает бот.

```typescript
import { Context } from 'grammy';
import { VpnService } from '../services/vpn-service/vpnService';
import { UserService } from '../services/user-service/userService';

export async function keyCommand(ctx: Context) {
  if (!ctx.from) return;

  try {
    // 1. Убедиться, что пользователь есть в БД (создаём, если нет)
    const user = await UserService.findOrCreateByTelegram(
      ctx.from.id,
      ctx.from.username,
    );

    // 2. Создать VPN ключ
    const link = await VpnService.createKeyForUser(ctx.from.id);

    // 3. Отправить ссылку пользователю
    await ctx.reply(
      `Вот твой VPN ключ:\n\`${link}\``,
      {
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      },
    );
  } catch (e) {
    console.error(e);
    await ctx.reply('Не удалось создать ключ. Обратитесь в тех. поддержку.');
  }
}
```

**Логика:**
1. Получить Telegram ID пользователя из `ctx.from.id`.
2. Создать/получить пользователя через `UserService`.
3. Сгенерировать VPN ключ через `VpnService`.
4. Отправить ссылку в Markdown формате.

### 4. Main Bot (`src/index.ts`)

Инициализация и запуск бота.

```typescript
import { Bot } from 'grammy';
import { keyCommand } from './commands/vpnCommands';
import 'dotenv/config';

const bot = new Bot(process.env.BOT_TOKEN!);

bot.command('key', keyCommand);

// Опционально: команда /start
bot.command('start', async (ctx) => {
  await ctx.reply('👋 Добро пожаловать!');
});

bot.start();
console.log('Bot started');
```

### 5. Database Connection (`src/services/db/db.ts`)

```typescript
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
```

**Примечание:** Используем пул соединений для масштабируемости.

---

## Ошибки и решения

### Ошибка 1: NULL в столбце "port"

**Симптомы:**
```
error: значение NULL в столбце "port" отношения "VpnKey" нарушает ограничение NOT NULL
```

**Причины:**
1. В коде переменная `port` получилась `undefined`.
2. Имя поля в БД не совпадало с именем в коде (например, `portPremium` вместо `port`).
3. В таблице `Server` значение в колонке `port` было `NULL`.

**Решение:**
1. Проверили структуру таблицы `Server` в pgAdmin:
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'Server';
   ```

2. Убедились, что есть колонка `port` с типом `INTEGER`:
   ```sql
   SELECT id, hostname, port
   FROM "Server";
   ```

3. Обновили все значения `port` на 8443:
   ```sql
   UPDATE "Server"
   SET port = 8443;
   ```

4. В коде использовали `const port = server.port;` без условностей.

5. Добавили логирование для отладки:
   ```typescript
   console.log('SERVER FROM DB:', server);
   console.log('SERVER PORT FIELD:', server.port);
   ```

**Вывод:** Всегда проверяй структуру БД перед тем, как обращаться к полям из кода!

### Ошибка 2: Несоответствие имён полей PostgreSQL и JavaScript

**Проблема:**
В PostgreSQL колонки могут быть с кавычками (`"portPremium"`) или без (`port`). node-pg (драйвер PostgreSQL) возвращает разные имена свойств.

**Как это проверить:**
```typescript
const { rows } = await client.query('SELECT * FROM "Server" LIMIT 1');
console.log(Object.keys(rows[0])); // Посмотреть точные имена свойств
```

**Рекомендация:** Используй snake_case для имён колонок (`port`, `user_id`, `created_at`), избегай CamelCase с кавычками.

### Ошибка 3: Автоинкремент ID не работает

**Проблема:**
При вставке нового пользователя вручную указывали `id`, что конфликтовало с автоинкрементом.

**Решение:**
```sql
-- ПРАВИЛЬНО (id генерируется автоматически)
INSERT INTO "User" ("telegramId", username, plan, status)
VALUES (123456, 'john', 'free', 'active');

-- НЕПРАВИЛЬНО (конфликт с autoinc)
INSERT INTO "User" (id, "telegramId", username, plan, status)
VALUES (1, 123456, 'john', 'free', 'active');
```

### Ошибка 4: Дублирование пользователей при `/start`

**Проблема:**
Без UNIQUE constraint на `telegramId` пользователь мог быть добавлен несколько раз.

**Решение:**
```sql
ALTER TABLE "User"
ADD CONSTRAINT user_telegramid_unique UNIQUE ("telegramId");
```

Теперь при попытке создать дубль получим ошибку, которую можно обработать в коде (либо вернуть существующего пользователя).

---

## Тестирование

### Этап 1: Проверка БД

1. **Открыть pgAdmin:**
   - Servers → PostgreSQL → Databases → vpn
   - Query Tool

2. **Проверить таблицы:**
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public';
   ```

3. **Проверить данные:**
   ```sql
   SELECT * FROM "User";
   SELECT * FROM "Server";
   SELECT * FROM "VpnKey";
   ```

### Этап 2: Тестирование вручную

1. **Добавить тестового пользователя:**
   ```sql
   INSERT INTO "User" ("telegramId", username, plan, status)
   VALUES (YOUR_TELEGRAM_ID, 'test_user', 'free', 'active');
   ```

   (Узнать свой Telegram ID через бота `@userinfobot`)

2. **Добавить тестовый сервер:**
   ```sql
   INSERT INTO "Server" (hostname, ip, location, port, status)
   VALUES ('kz-vpn-01', '1.2.3.4', 'KZ', 8443, 'active');
   ```

3. **Запустить бота:**
   ```bash
   npm run dev
   ```

4. **Отправить команду `/key` в Telegram:**
   - Бот должен ответить VLESS ссылкой.
   - В БД должна появиться запись в `VpnKey`.

### Этап 3: Проверка разницы планов

1. **Изменить план пользователя:**
   ```sql
   UPDATE "User"
   SET plan = 'premium'
   WHERE "telegramId" = YOUR_TELEGRAM_ID;
   ```

2. **Снова отправить `/key`:**
   - Проверить, что SNI изменился (например, с `aikyn.kz` на `github.com`).
   - Новая запись в `VpnKey` должна содержать `github.com`.

### Этап 4: Тестирование нового пользователя

1. **Попросить друга отправить `/key`:**
   - Его ID не должен быть в таблице `User`.
   - Бот должен создать новую запись автоматически.
   - Ему должна придти ссылка.

---

## Развёртывание

### Для разработки

```bash
# 1. Установить зависимости
npm install

# 2. Создать .env файл
cat > .env << EOF
DATABASE_URL=postgresql://user:password@localhost:5432/vpn
BOT_TOKEN=your_telegram_bot_token
PUBLIC_KEY=your_xray_reality_public_key
EOF

# 3. Запустить в режиме разработки (с автоперезагрузкой)
npm run dev
```

### Для production

```bash
# 1. Собрать TypeScript
npm run build

# 2. Запустить собранный JS
npm start
```

**Рекомендации:**
- Использовать PM2 для управления процессом:
  ```bash
  pm2 start dist/index.js --name "vpn-bot"
  pm2 save
  pm2 startup
  ```

- Проксировать логи:
  ```bash
  pm2 logs vpn-bot
  ```

- Для мониторинга PostgreSQL использовать `pg_stat_statements`:
  ```sql
  CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
  SELECT query, calls, total_time FROM pg_stat_statements
  ORDER BY total_time DESC LIMIT 10;
  ```

---

## Итоги

**Что реализовали:**

✅ Telegram-бот, выдающий VPN ключи  
✅ Поддержка нескольких тарифных планов (free / premium)  
✅ Автоматическое создание пользователей при первом обращении  
✅ Хранение ключей в PostgreSQL  
✅ Интеграция с Xray VPN сервером  

**Что потом можно добавить:**

- [ ] Лимиты на количество ключей (например, 3 для free, 10 для premium)
- [ ] Истечение ключей через N дней
- [ ] Команда `/list` для показа активных ключей
- [ ] Платёж через Telegram Stars за premium
- [ ] Синхронизация с Xray для отключения истёкших ключей
- [ ] Статистика использования трафика
- [ ] Админ-панель для управления серверами и пользователями

---

**Дата последнего обновления:** December 12, 2025  
**Версия:** 1.0

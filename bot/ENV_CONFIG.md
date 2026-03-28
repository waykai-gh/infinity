# Настройка `.env` и таблица `"VpnKey"`

Этот бот:
- пишет пользователей в Postgres (таблица `"User"`);
- выдаёт VLESS / DNS / Hysteria2 по тарифу пользователя;
- **основной источник строк** — таблица `"VpnKey"` (поля `kind`, `tier`, `value`, `sort_order`), если при старте удалось подключиться к БД и в таблице есть строки для нужной пары `(tier, kind)`;
- **резерв (fallback)** — переменные `VLESS_*`, `DNS_*`, `HYSTERIA2_*` в `.env`, если для этого тарифа в БД нет ни одной строки.

При старте вызывается `prefetchAccessDatabase()` (загрузка `"VpnKey"`), затем `loadAccessConfig()`. Должен быть хотя бы один VLESS для тарифа `free`: либо строки в БД (`kind=vless`, `tier=free`), либо `VLESS_FREE` в `.env`.

## Миграции

- [`src/services/db-service/migration/002_vpn_key.sql`](src/services/db-service/migration/002_vpn_key.sql) — создание `"VpnKey"`.
- [`src/services/db-service/migration/003_seed_vpn_key.sql`](src/services/db-service/migration/003_seed_vpn_key.sql) — начальный сид VLESS (при необходимости правьте и накатывайте вручную).

Пример наката:

```bash
psql "$DATABASE_URL" -f src/services/db-service/migration/002_vpn_key.sql
psql "$DATABASE_URL" -f src/services/db-service/migration/003_seed_vpn_key.sql
```

## Переменные окружения

### Обязательные
- `BOT_TOKEN`
- `DATABASE_URL`
- Либо строки VLESS для `free` в таблице `"VpnKey"`, либо **`VLESS_FREE`** в `.env** (хотя бы одна `vless://...` ссылка), если в БД для `tier=free` пусто.

### IDs (опционально)
CSV-списки через запятую:
- `ADMIN_IDS=111,222`
- `TEST_IDS=333`
- `FRIEND_IDS=444,555`

Приоритет тарифа: `admin > test > friend > free`.

### Резерв: ключи только через `.env`
Если для тарифа в `"VpnKey"` нет строк, используются переменные (многострочные значения, разделитель — **новая строка**):

- `VLESS_ADMIN`, `VLESS_TEST`, `VLESS_FRIEND`, `VLESS_FREE`
- `DNS_ADMIN`, `DNS_TEST`, `DNS_FRIEND`, `DNS_FREE`
- `HYSTERIA2_ADMIN`, `HYSTERIA2_TEST`, `HYSTERIA2_FRIEND`, `HYSTERIA2_FREE`

Пример:

```env
VLESS_FREE="vless://...KZ
vless://...NL"
DNS_FREE="9.9.9.9
149.112.112.112"
HYSTERIA2_FRIEND="hysteria2://..."
```

## Быстрая проверка

```bash
npm run test:config
```

Проверяет подключение к БД, загрузку `"VpnKey"` и валидность итогового конфига.

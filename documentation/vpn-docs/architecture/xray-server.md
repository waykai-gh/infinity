# VLESS+Reality VPN с Xray и gRPC API — Полное руководство

> **Версия:** 2.0  
> **Дата обновления:** 2 января 2026  
> **Статус:** Актуальное руководство на основе реальных боевых серверов  
> **Проверено на:** Debian 12, Ubuntu 22.04, Ubuntu 24.04 с Xray v25.x

---

## Оглавление

1. [Быстрое резюме](#быстрое-резюме)
2. [Архитектура системы](#архитектура-системы)
3. [Требования перед установкой](#требования-перед-установкой)
4. [Пошаговая установка нового сервера](#пошаговая-установка-нового-сервера)
5. [Миграция существующего сервера на API](#миграция-существующего-сервера-на-api)
6. [Понимание ключей и параметров Reality](#понимание-ключей-и-параметров-reality)
7. [Генерация клиентской конфигурации](#генерация-клиентской-конфигурации)
8. [Управление через Telegram бот](#управление-через-telegram-бот)
9. [Диагностика и решение проблем](#диагностика-и-решение-проблем)
10. [Частые ошибки и как их исправить](#частые-ошибки-и-как-их-исправить)

---

## Быстрое резюме

**VLESS+Reality** — это протокол VPN, который маскируется под обычное HTTPS-соединение к легальному веб-сайту (например, microsoft.com). Это позволяет обойти блокировки провайдеров, которые способны определить VPN по анализу трафика.

**Три компонента:**
- **VLESS** — простой протокол туннелирования (идентификация по UUID)
- **Reality** — криптографическая маскировка под реальный сайт (X25519 ключи)
- **Xray API** — управление пользователями через gRPC без перезагрузки сервера

**У вас сейчас три сервера:**

| Сервер | IP | Статус | Что нужно сделать |
|--------|-------|--------|------------------|
| Казахстан (Vultr) | 91.207.75.142 | ✅ Продакшн (без API) | Опционально: миграция на API для упрощения управления |
| Амстердам (Hetzner?) | 95.81.100.44 | ❌ Не готов | Развернуть с нуля (раздел 4) |
| Южная Корея (Vultr) | 141.164.45.6 | 🟡 Готов к API | API включен, тестовый юзер работает |

---

## Архитектура системы

### Как это работает: пошаговый процесс

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. КЛИЕНТ (Windows/macOS/Linux/Android)                          │
│    ├─ Приложение (Chrome, Telegram и т.д.)                      │
│    └─ Xray клиент (v2rayN, Nekobox, v2RayTun)                   │
│       └─ Парсит VLESS-ссылку → генерирует REALITY-подключение   │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           │ Шифрованный трафик,
                           │ маскирован под HTTPS к microsoft.com:443
                           │ (но реально на сервер 141.164.45.6:8443)
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│ 2. СЕРВЕР XRAY (VPS в Корее)                                     │
│    ┌──────────────────────────────────────────────────────────┐  │
│    │ Xray daemon на порту 8443 (VLESS+Reality)              │  │
│    │  ├─ Проверка PublicKey + ShortID (REALITY)             │  │
│    │  ├─ Проверка UUID (VLESS)                              │  │
│    │  └─ Расшифровка VLESS                                  │  │
│    └──────────────────────────────────────────────────────────┘  │
│    ┌──────────────────────────────────────────────────────────┐  │
│    │ Xray API gRPC на 127.0.0.1:10085                        │  │
│    │  ├─ Управление пользователями (HandlerService)         │  │
│    │  └─ Сбор статистики (StatsService)                     │  │
│    └──────────────────────────────────────────────────────────┘  │
│    ┌──────────────────────────────────────────────────────────┐  │
│    │ iptables NAT + IP Forwarding                            │  │
│    │  └─ Маршрутизирует трафик клиента в интернет           │  │
│    └──────────────────────────────────────────────────────────┘  │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           │ Обычный интернет-трафик
                           │ (Google, Telegram и т.д.)
                           ↓
                      Целевые сервисы
```

### Поток данных по слоям

```
Клиент                    Сервер
─────────────────────────────────
Приложение
    ↓
   (TCP:443, маскирован)
    ↓ VLESS+Reality шифрование
    ↓
Xray клиент ────────────→ Xray сервер (:8443)
                            ↓
                         REALITY проверка ✓
                         VLESS проверка ✓
                            ↓
                         Расшифровка
                            ↓
                         iptables NAT
                            ↓
                         IP Forwarding ✓
                            ↓
                         Интернет (:80, :443 и т.д.)
                            ↓
────────────────────────→ Целевой сервис
```

### Почему это работает против блокировок

1. **DPI (Deep Packet Inspection)** не может определить VPN:
   - Трафик выглядит как обычное HTTPS-соединение к microsoft.com
   - Используется реальный сертификат Microsoft (или другого сайта)
   - Нет подозрительных заголовков

2. **Reality** использует криптографический скрытный канал:
   - Без правильного PublicKey и ShortID пакет просто игнорируется
   - Для провайдера это выглядит как неудачное соединение к ms.com

3. **Нет централизованной базы**:
   - Каждый сервер использует свои уникальные ключи
   - Невозможно глобально запретить все Reality-серверы

---

## Требования перед установкой

### Аппаратные требования

- **VPS/VDS сервер** с минимум 1 vCPU и 512 MB RAM
- **Рекомендуемо:** 2 vCPU, 1-2 GB RAM (особенно если много клиентов)
- **Дисковое пространство:** 2-5 GB свободного места (для ОС, Xray, логов)

### Сетевые требования

- **Статический IP-адрес** (обязательно!)
- **Открытый порт 8443** (или другой, но 8443 рекомендуется для HTTPS маскировки)
- **SSH доступ (порт 22)** для управления
- **Исходящий интернет** (для подключения клиентов к сайтам)

### Операционная система

- Ubuntu 20.04 LTS +
- Debian 11+
- **НЕ использовать:** CentOS/RHEL (можно, но требует iptables-legacy)

### Прочие требования

- **Знания:** базовый Linux (SSH, nano, systemctl)
- **Python3** (опционально, но нужен для вычисления PublicKey)
- **Понимание:** что такое UUID, X25519 криптография, NAT

---

## Пошаговая установка нового сервера

### Шаг 1: Создание пользователя и обновление системы

Подключитесь по SSH на новый сервер:

```bash
# Обновите систему
sudo apt update && sudo apt upgrade -y

# Создайте обычного пользователя (вместо работы от root)
sudo adduser vpnadmin
sudo usermod -aG sudo vpnadmin

# Переключитесь на нового пользователя
su - vpnadmin
```

**Почему это нужно:**
- Обновления закрывают дыры безопасности
- root доступ опасен для регулярных операций

---

### Шаг 2: Установка зависимостей

```bash
sudo apt install -y \
  curl wget git nano jq htop \
  iptables netfilter-persistent \
  tcpdump net-tools \
  python3-pip

# Для вычисления PublicKey из PrivateKey
pip3 install cryptography --break-system-packages
```

| Пакет | Зачем |
|-------|-------|
| curl, wget | Загрузка файлов |
| nano | Текстовый редактор |
| jq | Парсинг JSON |
| iptables | Firewall и NAT |
| netfilter-persistent | Сохранение правил iptables |
| tcpdump | Диагностика сетевого трафика |
| python3 | Вычисление ключей |

---

### Шаг 3: Установка Xray

```bash
# Официальный установщик
bash -c "$(curl -L https://github.com/XTLS/Xray-install/raw/main/install-release.sh)" @ install

# Проверка
xray version
```

Xray установится в `/usr/local/bin/xray`, конфигурация в `/usr/local/etc/xray/`.

**Systemd сервис:** `xray.service` (автоматически)

---

### Шаг 4: Генерация ключей

**UUID (для идентификации пользователя):**

```bash
UUID=$(cat /proc/sys/kernel/random/uuid)
echo "UUID: $UUID"
```

Пример: `befcba3b-abdb-49e0-b49c-2328d1ef9f4e`

**Reality ключи (X25519):**

```bash
xray x25519
```

Пример вывода:

```
PrivateKey: gP5TU6beS9rbpGn_n0xbvGxdp1yYVruM00XdfmmWD3g
Password: CrCXQXGt83iUCh0Op67DTn8vUdMzqr1ZM1isjbQUWkE
Hash32: EWyi636ffTle1D0dtnQvQMuAP4fNRkiAN7z6jTpQz0A
```

⚠️ **Важно:** "Password" здесь — это **PublicKey**! Это наследие от V2Ray. Используй его как `pbk` в клиентской ссылке.

**ShortID (дополнительная идентификация):**

```bash
SHORTID=$(openssl rand -hex 8)
echo "ShortID: $SHORTID"
```

Пример: `1cb71c73ddf63293`

**Сохраните эти четыре значения где-нибудь (например, в защищённом текстовом файле):**
```
UUID: befcba3b-abdb-49e0-b49c-2328d1ef9f4e
PrivateKey: gP5TU6beS9rbpGn_n0xbvGxdp1yYVruM00XdfmmWD3g
PublicKey: CrCXQXGt83iUCh0Op67DTn8vUdMzqr1ZM1isjbQUWkE
ShortID: 1cb71c73ddf63293
```

---

### Шаг 5: Сканирование подходящих SNI

⚠️ **Важно:** SNI должны быть реальные сайты с **TLS 1.3**, иначе Reality не будет работать.

```bash
# Скачиваем RealiTLScanner
wget https://github.com/XTLS/RealiTLScanner/releases/download/v0.2.1/RealiTLScanner-linux-64 -O RealiTLScanner
chmod +x RealiTLScanner

# Сканируем подсеть вашего сервера (замените на свою!)
./RealiTLScanner -addr 141.164.45.0/24 -thread 20 -timeout 5 -out scan.csv

# Просмотр как таблица
column -s, -t scan.csv | less -S
```

Из результатов выберите 3-4 домена с:
- Сертификатом от Let's Encrypt / Cloudflare / Google
- TLS 1.3
- Не локальные (localhost, fake, test)

Пример хороших SNI:
```
*.cloudwaysapps.com
pass.itinerariummentis.org
mybestedu.kr
ktop-beauty.co.kr
```

---

### Шаг 6: Настройка IP Forwarding и NAT

**Включить IP Forwarding:**

```bash
# Разово до ребута
sudo sysctl -w net.ipv4.ip_forward=1

# Постоянно
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Проверка
cat /proc/sys/net/ipv4/ip_forward
# Должно быть: 1
```

**Настроить NAT (MASQUERADE):**

```bash
# Узнаем внешний интерфейс
INTERFACE=$(ip route | grep default | awk '{print $5}')
echo "Интерфейс: $INTERFACE"

# Очищаем старые правила
sudo iptables -F
sudo iptables -t nat -F

# Разрешаем по умолчанию
sudo iptables -P INPUT ACCEPT
sudo iptables -P FORWARD ACCEPT
sudo iptables -P OUTPUT ACCEPT

# Включаем NAT для выхода
sudo iptables -t nat -A POSTROUTING -o $INTERFACE -j MASQUERADE

# Разрешаем пересылку
sudo iptables -A FORWARD -m state --state RELATED,ESTABLISHED -j ACCEPT
sudo iptables -A FORWARD -j ACCEPT

# Сохраняем правила
sudo netfilter-persistent save
```

**Проверка:**

```bash
sudo iptables -t nat -L -n -v | grep MASQUERADE
# Должна быть хотя бы одна строка с вашим интерфейсом
```

---

### Шаг 7: Создание конфига Xray с API

Создайте файл `/usr/local/etc/xray/config.json`:

```bash
sudo nano /usr/local/etc/xray/config.json
```

**Вставьте этот конфиг (замените значения!):**

```json
{
  "log": {
    "loglevel": "warning",
    "access": "/var/log/xray/access.log",
    "error": "/var/log/xray/error.log"
  },

  "api": {
    "tag": "api",
    "services": ["HandlerService", "StatsService"]
  },

  "stats": {},
  "policy": {
    "levels": {
      "0": {
        "statsUserUplink": true,
        "statsUserDownlink": true
      }
    },
    "system": {
      "statsInboundUplink": true,
      "statsInboundDownlink": true
    }
  },

  "inbounds": [
    {
      "listen": "127.0.0.1",
      "port": 10085,
      "protocol": "dokodemo-door",
      "settings": {
        "address": "127.0.0.1"
      },
      "tag": "api"
    },
    {
      "port": 8443,
      "protocol": "vless",
      "tag": "vless-inbound",
      "settings": {
        "clients": [],
        "decryption": "none"
      },
      "streamSettings": {
        "network": "tcp",
        "security": "reality",
        "realitySettings": {
          "show": false,
          "dest": "141.164.45.100:443",
          "xver": 0,
          "privateKey": "ВАШ_PRIVATEKEY_ЗДЕСЬ",
          "serverNames": [
            "*.cloudwaysapps.com",
            "pass.itinerariummentis.org",
            "mybestedu.kr",
            "ktop-beauty.co.kr"
          ],
          "shortIds": [
            "ВАШ_SHORTID_ЗДЕСЬ"
          ],
          "maxTimeDiff": 0,
          "minClientVer": "",
          "maxClientVer": ""
        },
        "tcpSettings": {
          "header": {
            "type": "none"
          }
        }
      },
      "sniffing": {
        "enabled": true,
        "destOverride": ["http", "tls"]
      }
    }
  ],

  "outbounds": [
    {
      "protocol": "freedom",
      "tag": "direct"
    },
    {
      "protocol": "blackhole",
      "tag": "block"
    }
  ],

  "routing": {
    "domainStrategy": "IPIfNonMatch",
    "rules": [
      {
        "inboundTag": ["api"],
        "outboundTag": "api",
        "type": "field"
      }
    ]
  }
}
```

**Что означает каждый параметр:**

| Параметр | Значение | Зачем |
|----------|---------|-------|
| `"clients": []` | Пустой массив | Управление через API, без статических клиентов |
| `"dest"` | IP:443 сайта для маскировки | Xray создаёт "фейковое" соединение к этому адресу |
| `"privateKey"` | Ваш PrivateKey | **ТОЛЬКО НА СЕРВЕРЕ!** Никому не показывайте |
| `"serverNames"` | Список SNI | Несколько доменов для резервирования |
| `"shortIds"` | Массив ShortID | Клиент должен знать правильный ShortID |
| `"fp": "chrome"` | Fingerprint | Для клиента (TLS 1.3 эмуляция) |

---

### Шаг 8: Запуск Xray и проверка

```bash
# Создание логов
sudo mkdir -p /var/log/xray
sudo chown nobody:nogroup /var/log/xray
sudo chmod 755 /var/log/xray

# Проверка конфига
sudo xray run -test -c /usr/local/etc/xray/config.json
# Должно быть: Configuration OK

# Запуск
sudo systemctl restart xray
sudo systemctl enable xray

# Статус
sudo systemctl status xray
# Должно быть: active (running)

# Проверка слушания на портах
sudo ss -tlnp | grep xray
# Должны быть 8443 и 10085
```

---

### Шаг 9: Тестирование API

```bash
# Проверяем, что API отвечает (пользователей будет 0, так как clients пустой)
xray api inbounduser --server=127.0.0.1:10085 --tag=vless-inbound

# Вывод: {} (пусто, но API работает!)
```

---

## Миграция существующего сервера на API

Если у вас уже есть рабочий сервер (например, 91.207.75.142 в Казахстане), можно его постепенно перевести на управление через API.

### Шаг 1: Бэкап текущего конфига

```bash
sudo cp /usr/local/etc/xray/config.json /usr/local/etc/xray/config.json.backup
```

### Шаг 2: Добавление API блоков

Возьмите текущий `config.json` и добавьте в начало:

```json
{
  "log": { ... }, // оставить как было
  
  "api": {
    "tag": "api",
    "services": ["HandlerService", "StatsService"]
  },

  "stats": {},
  "policy": {
    "levels": {
      "0": {
        "statsUserUplink": true,
        "statsUserDownlink": true
      }
    },
    "system": {
      "statsInboundUplink": true,
      "statsInboundDownlink": true
    }
  },

  "inbounds": [
    {
      "listen": "127.0.0.1",
      "port": 10085,
      "protocol": "dokodemo-door",
      "settings": {
        "address": "127.0.0.1"
      },
      "tag": "api"
    },
    { ... ваш текущий vless-inbound, не трогайте ... }
  ],
  
  "routing": {
    "rules": [
      {
        "inboundTag": ["api"],
        "outboundTag": "api",
        "type": "field"
      }
      // ... другие правила как были ...
    ]
  }
}
```

**Важно:**
- Не меняйте существующий VLESS-inbound
- Просто добавьте API-инбаунд перед ним
- Добавьте `tag: "vless-inbound"` к вашему текущему inbound'у (если его ещё нет)
- Добавьте routing rule для api

### Шаг 3: Плавная миграция клиентов

Можете оставить статических клиентов в `clients` и одновременно добавлять новых через API. Это позволит:

1. Не отключать существующих клиентов
2. Постепенно переводить их на API-управление
3. Тестировать API на боевом сервере

---

## Понимание ключей и параметров Reality

### UUID vs PrivateKey vs PublicKey vs ShortID

| Ключ | Где использовать | Видна ли всем | Формат | Пример |
|------|-----------------|---------|---------|---------|
| **UUID** | Сервер + Клиент | ❌ Шифруется | UUID v4 | `befcba3b-abdb-49e0-b49c-2328d1ef9f4e` |
| **PrivateKey** | **ТОЛЬКО СЕРВЕР** | ❌ Секретно | Base64 (32 байта) | `gP5TU6beS9rbpGn_n0xbvGxdp1yYVruM00XdfmmWD3g` |
| **PublicKey** | **ТОЛЬКО КЛИЕНТ** | ❌ Шифруется | Base64 (32 байта) | `CrCXQXGt83iUCh0Op67DTn8vUdMzqr1ZM1isjbQUWkE` |
| **ShortID** | Сервер + Клиент | ❌ Шифруется | HEX (8-16 символов) | `1cb71c73ddf63293` |

### PublicKey vs Password в выводе `xray x25519`

Когда вы вводите `xray x25519`, вывод может выглядеть так:

```
PrivateKey: gP5TU6beS9rbpGn_n0xbvGxdp1yYVruM00XdfmmWD3g
Password: CrCXQXGt83iUCh0Op67DTn8vUdMzqr1ZM1isjbQUWkE
Hash32: EWyi636ffTle1D0dtnQvQMuAP4fNRkiAN7z6jTpQz0A
```

**Расшифровка:**
- `PrivateKey` — это действительно приватный ключ (только на сервер)
- `Password` — это ваш **публичный ключ** (в ссылку для клиента)
- `Hash32` — можно игнорировать (остаток от старых версий)

Команда `xray x25519` генерирует **пару** (private + public), как и положено X25519.

### Зачем несколько ShortID?

Можно указать несколько `shortIds` на сервере:

```json
"shortIds": [
  "1cb71c73ddf63293",
  "a1b2c3d4e5f6g7h8",
  "xxxxxxxxxxxxxxxx"
]
```

Это позволяет:
1. **Резервирование** — если один скомпрометирован
2. **Балансировка** — разные клиенты получают разные ShortID
3. **Обновление** — новый ShortID, не отключая старых

Клиент должен знать один из них (не все).

---

## Генерация клиентской конфигурации

### Вычисление PublicKey из PrivateKey (если нужно)

Если вы потеряли вывод `xray x25519` и знаете только PrivateKey:

```bash
cat > /tmp/genkey.py << 'EOF'
import base64
from cryptography.hazmat.primitives.asymmetric import x25519

private_b64 = "gP5TU6beS9rbpGn_n0xbvGxdp1yYVruM00XdfmmWD3g"  # ВАШ PRIVATEKEY
private_bytes = base64.urlsafe_b64decode(private_b64 + "==")
private_key = x25519.X25519PrivateKey.from_private_bytes(private_bytes)
public_key = private_key.public_key()
public_bytes = public_key.public_bytes_raw()
public_b64 = base64.urlsafe_b64encode(public_bytes).decode().rstrip("=")
print(f"PublicKey: {public_b64}")
EOF

python3 /tmp/genkey.py
```

### Сборка VLESS-ссылки

Пример с реальными параметрами:

```
vless://befcba3b-abdb-49e0-b49c-2328d1ef9f4e@141.164.45.6:8443?encryption=none&security=reality&fp=chrome&pbk=CrCXQXGt83iUCh0Op67DTn8vUdMzqr1ZM1isjbQUWkE&sni=pass.itinerariummentis.org&sid=1cb71c73ddf63293&type=tcp&flow=xtls-rprx-vision#Корея-VLESS
```

**Расшифровка параметров:**

| Параметр | Значение | Зачем |
|----------|---------|-------|
| `vless://` | Протокол | Обязательно |
| `UUID` | befcba3b-abdb-49e0-b49c-2328d1ef9f4e | Идентификация пользователя |
| `@IP:PORT` | 141.164.45.6:8443 | Адрес и порт сервера |
| `encryption=none` | none | VLESS не требует дополнительного шифрования (Reality уже шифрует) |
| `security=reality` | reality | Тип маскировки |
| `fp=chrome` | chrome | TLS fingerprint (имитация браузера) |
| `pbk=` | PublicKey | Публичный ключ для REALITY |
| `sni=` | Домен | SNI для маскировки (должен быть из вашего serverNames) |
| `sid=` | ShortID | Дополнительный идентификатор |
| `type=tcp` | tcp | Тип соединения |
| `flow=xtls-rprx-vision` | xtls-rprx-vision | Алгоритм потока |
| `#Корея-VLESS` | Имя подключения | Видно в клиенте |

### Импорт на разные платформы

**Android (v2RayTun):**

1. Скачайте v2RayTun из Google Play
2. Нажмите `+`
3. `Import from clipboard` (если скопировали ссылку)
4. Или выберите `VLESS` и заполните вручную
5. `Connect`

**Windows (v2rayN):**

1. Скачайте v2rayN
2. `Subscriptions` → `Manage subscriptions` → Вставьте VLESS-ссылку
3. Или `Add VMess/VLESS` вручную
4. `Enter` для подключения

**macOS/Linux (NekoRay):**

1. Установите NekoRay
2. `Add profile` → `Paste from clipboard`
3. Нажмите на профиль → `Connect`

---

## Управление через Telegram бот

### Общая архитектура

```
Пользователь (Telegram)
    ↓ /newuser
Telegram Bot (grammY, Node.js)
    ├─ Генерирует UUID + ShortID
    ├─ Сохраняет в PostgreSQL
    ├─ Вызывает Xray gRPC API
    │  (добавляет в vless-inbound)
    └─ Возвращает VLESS-ссылку
```

### Установка зависимостей бота

```bash
cd ~/vpn-bot
npm install @grpc/grpc-js @grpc/proto-loader uuid
```

### Пример кода: добавление пользователя через API

```typescript
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { randomUUID } from 'crypto';
import { randomBytes } from 'crypto';

class XrayAPIClient {
  private client: any;

  constructor(apiAddress: string = '127.0.0.1:10085') {
    // Загрузить proto файлы из Xray-core репозитория
    // git clone https://github.com/XTLS/Xray-core.git
    // cp -r Xray-core/app ./proto/app
    
    const PROTO_PATH = __dirname + '/proto/app/proxyman/command/command.proto';
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true
    });

    const grpcObject = grpc.loadPackageDefinition(packageDefinition);
    const proxyman = (grpcObject.xray.app.proxyman.command as any);
    const HandlerService = proxyman.HandlerService;

    this.client = new HandlerService(
      apiAddress,
      grpc.credentials.createInsecure()
    );
  }

  async addUser(
    inboundTag: string,
    email: string,
    uuid: string,
    flow: string = 'xtls-rprx-vision'
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = {
        inbound_tag: inboundTag,
        user: {
          level: 0,
          email: email,
          account: {
            type_url: 'type.googleapis.com/xray.proxy.vless.Account',
            value: Buffer.from(JSON.stringify({
              id: uuid,
              flow: flow
            }))
          }
        }
      };

      this.client.AlterInbound(request, (error: any, response: any) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }
}

// Использование в боте
const xrayAPI = new XrayAPIClient('127.0.0.1:10085');

// Когда пользователь пишет /newuser
const uuid = randomUUID();
const shortId = randomBytes(8).toString('hex');
const email = `user_${Date.now()}@vpn.local`;

await xrayAPI.addUser('vless-inbound', email, uuid, 'xtls-rprx-vision');

// Сохранить в PostgreSQL
await db.query(
  'INSERT INTO users (telegram_id, uuid, email, short_id) VALUES ($1, $2, $3, $4)',
  [ctx.from.id, uuid, email, shortId]
);

// Сгенерировать ссылку
const vlessUrl = `vless://${uuid}@141.164.45.6:8443?encryption=none&security=reality&fp=chrome&pbk=CrCXQXGt83iUCh0Op67DTn8vUdMzqr1ZM1isjbQUWkE&sni=pass.itinerariummentis.org&sid=${shortId}&type=tcp&flow=xtls-rprx-vision#VPN`;

await ctx.reply(`✅ Готово!\n\n${vlessUrl}`);
```

---

## Диагностика и решение проблем

### Проблема 1: Клиент подключается, но интернета нет

**Симптомы:**
- Приложение говорит "Connected"
- Но сайты не загружаются

**Диагностика:**

```bash
# На сервере проверяем трафик
sudo tcpdump -i any port 8443 -n
# Подключитесь с клиента — должны быть пакеты

# Проверяем IP forwarding
cat /proc/sys/net/ipv4/ip_forward  # должно быть 1

# Проверяем NAT
sudo iptables -t nat -L -n -v | grep MASQUERADE
# должна быть строка с вашим интерфейсом

# Проверяем логи Xray
sudo tail -f /var/log/xray/error.log
# не должно быть "authentication failed"
```

**Решение:**

1. Если `ip_forward == 0`:
```bash
sudo sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf
```

2. Если нет MASQUERADE:
```bash
INTERFACE=$(ip route | grep default | awk '{print $5}')
sudo iptables -t nat -A POSTROUTING -o $INTERFACE -j MASQUERADE
sudo netfilter-persistent save
```

---

### Проблема 2: "authentication failed" в логах

**Симптомы:**
- `/var/log/xray/error.log` полон: `REALITY: authentication failed`
- Клиент трафик отправляет, но не подключается

**Причины:**
- UUID не совпадает между сервером и клиентом
- PublicKey неправильный
- ShortID неправильный

**Решение:**

```bash
# Проверить UUID в config.json
sudo grep '"id"' /usr/local/etc/xray/config.json

# Убедиться, что это ТОЧНО совпадает с ссылкой клиента

# Пересчитать PublicKey (если потеряли)
python3 /tmp/genkey.py

# Перезапустить Xray
sudo systemctl restart xray
```

---

### Проблема 3: Порт 8443 закрыт снаружи

**Диагностика:**

```bash
# Локально на компьютере
nc -zv ВАШ_IP 8443

# Или через сайт
# https://www.yougetsignal.com/tools/open-ports/
```

**Решение:**
- Свяжитесь с хостингом (может быть блокировка на стороне провайдера)
- Проверьте панель управления VPS (может быть firewall)
- Убедитесь, что правила iptables не блокируют:
```bash
sudo iptables -L -n | grep 8443  # не должно быть DROP
```

---

### Проблема 4: SSH перестал работать после `iptables -F`

**Решение (через VNC консоль):**

```bash
# Просто разрешить все входящие
sudo iptables -P INPUT ACCEPT
sudo iptables -P FORWARD ACCEPT
sudo iptables -P OUTPUT ACCEPT

# Потом уже настраивать правильно
```

---

## Частые ошибки и как их исправить

### Ошибка: "netfilter-persistent: command not found"

**Решение:**
```bash
sudo apt install -y netfilter-persistent iptables-persistent
```

Или просто не используйте `save` пока правила не зафиксируются.

---

### Ошибка: "Configuration OK" но Xray не запускается

**Причина:** Обычно это проблема с логами (нет прав на `/var/log/xray`)

**Решение:**
```bash
sudo mkdir -p /var/log/xray
sudo chown nobody:nogroup /var/log/xray
sudo chmod 755 /var/log/xray
sudo systemctl restart xray
```

---

### Ошибка: UUID работает, но новые пользователи через API не добавляются

**Диагностика:**
```bash
# Проверить API
xray api inbounduser --server=127.0.0.1:10085 --tag=vless-inbound

# Проверить ошибки в коде бота
# Убедиться, что inboundTag == "vless-inbound"
# Убедиться, что proto файлы загружены правильно
```

---

### Ошибка: "Failed to start: main: failed to initialize acc"

**Причина:** Обычно permission denied на файлы логов

**Решение:**
```bash
sudo rm -f /var/log/xray/*.log
sudo mkdir -p /var/log/xray
sudo chown nobody:nogroup /var/log/xray
sudo systemctl restart xray
```

---

## Практический пример: полная миграция нового сервера

Вы купили новый VPS в Амстердаме (95.81.100.44) и хотите его настроить.

### Последовательность действий

```bash
# 1. Подключиться
ssh root@95.81.100.44

# 2. Создать пользователя
sudo adduser vpnadmin
sudo usermod -aG sudo vpnadmin
su - vpnadmin

# 3. Установить зависимости
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git nano jq htop iptables netfilter-persistent tcpdump net-tools python3-pip
pip3 install cryptography --break-system-packages

# 4. Установить Xray
bash -c "$(curl -L https://github.com/XTLS/Xray-install/raw/main/install-release.sh)" @ install
xray version

# 5. Сгенерировать ключи
UUID=$(cat /proc/sys/kernel/random/uuid); echo "UUID: $UUID"
xray x25519
SHORTID=$(openssl rand -hex 8); echo "ShortID: $SHORTID"

# 6. Сканировать SNI
wget https://github.com/XTLS/RealiTLScanner/releases/download/v0.2.1/RealiTLScanner-linux-64 -O RealiTLScanner
chmod +x RealiTLScanner
./RealiTLScanner -addr 95.81.0.0/16 -thread 20 -timeout 5 -out scan.csv
column -s, -t scan.csv | less -S

# 7. Выбрать SNI, например:
# www.amazon.com
# www.google.com
# github.com

# 8. Настроить IP Forwarding
sudo sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf

# 9. Настроить NAT
INTERFACE=$(ip route | grep default | awk '{print $5}')
sudo iptables -F
sudo iptables -t nat -F
sudo iptables -P INPUT ACCEPT
sudo iptables -P FORWARD ACCEPT
sudo iptables -P OUTPUT ACCEPT
sudo iptables -t nat -A POSTROUTING -o $INTERFACE -j MASQUERADE
sudo iptables -A FORWARD -m state --state RELATED,ESTABLISHED -j ACCEPT
sudo iptables -A FORWARD -j ACCEPT
sudo netfilter-persistent save

# 10. Создать config.json
# (см. шаг 7 выше в инструкции)
sudo nano /usr/local/etc/xray/config.json

# 11. Запустить
sudo mkdir -p /var/log/xray
sudo chown nobody:nogroup /var/log/xray
sudo xray run -test -c /usr/local/etc/xray/config.json
sudo systemctl restart xray
sudo systemctl status xray

# 12. Проверить API
xray api inbounduser --server=127.0.0.1:10085 --tag=vless-inbound
# Должно быть: {}

# 13. Проверить порт
sudo ss -tlnp | grep xray

# Готово! Сервер настроен и готов к управлению через API
```

---

## Краткая справка по командам

### Основные команды Xray

```bash
# Версия
xray -version

# Тест конфига
sudo xray run -test -c /usr/local/etc/xray/config.json

# Запуск/остановка (через systemd)
sudo systemctl start xray
sudo systemctl stop xray
sudo systemctl restart xray
sudo systemctl status xray

# Логи
sudo tail -f /var/log/xray/access.log
sudo tail -f /var/log/xray/error.log
sudo journalctl -u xray -f

# API
xray api inbounduser --server=127.0.0.1:10085 --tag=vless-inbound
```

### Сетевые команды

```bash
# Проверка открытого порта
sudo ss -tlnp | grep xray

# Трафик на порту
sudo tcpdump -i any port 8443 -n

# IP Forwarding
cat /proc/sys/net/ipv4/ip_forward

# iptables
sudo iptables -L -n
sudo iptables -t nat -L -n -v
sudo iptables -F  # ОСТОРОЖНО! Очищает все правила

# Сохранение iptables
sudo netfilter-persistent save
```

### Утилиты

```bash
# Мониторинг процессов
htop

# Диагностика сети
tcpdump
netstat -nap

# JSON парсер
jq '.key' file.json

# Генерация ключей
openssl rand -hex 8  # ShortID
```

---

## Итоговая чек-лист для нового сервера

- [ ] SSH доступ работает
- [ ] `apt update && apt upgrade` выполнены
- [ ] Xray установлен (`xray -version`)
- [ ] Сгенерированы ключи (UUID, PrivateKey, PublicKey, ShortID)
- [ ] Сканированы SNI (RealiTLScanner)
- [ ] IP Forwarding включен (`cat /proc/sys/net/ipv4/ip_forward == 1`)
- [ ] NAT настроен (`iptables -t nat -L | grep MASQUERADE`)
- [ ] config.json создан и заполнен
- [ ] Xray запускается (`systemctl status xray == active`)
- [ ] API работает (`xray api inbounduser == {}`)
- [ ] Клиент подключается и интернет работает
- [ ] Логи не содержат ошибок `authentication failed`

---

## Ссылки на ресурсы

- **Xray-core:** https://github.com/XTLS/Xray-core
- **Xray документация:** https://xtls.github.io/
- **RealiTLScanner:** https://github.com/XTLS/RealiTLScanner
- **grammY (Telegram бот):** https://grammy.dev/
- **V2rayN (Android клиент):** https://github.com/2dust/v2rayN
- **NekoBox (Windows):** https://github.com/MatsuriDayo/NekoBoxForAndroid

---

## Версии и изменения

**v2.0 (2 января 2026):**
- Полная переработка на основе реальных боевых серверов
- Добавлены примеры с реальными IP адресами
- Исправлены ошибки из старой документации
- Добавлена часть про API и интеграцию с ботом
- Раздел про миграцию существующих серверов

**Что было неправильно в v1.0:**
- Публичный ключ не выводился (неверная информация)
- Недостаточно информации про IP Forwarding и NAT
- Не было примеров кода для API
- Не было практических примеров миграции
- Лишняя информация про UFW (он может конфликтовать)

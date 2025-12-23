-- 001_init.sql
-- Полное создание базы vpn и таблиц User, Server, VpnKey

-- 1. Создание базы (нужно только если БД ещё нет).
-- Обычно это делаешь один раз руками на сервере.
-- На локалке у тебя она уже создана, так что этот блок можно пропустить.

-- CREATE DATABASE vpn
--     WITH
--     OWNER = postgres
--     ENCODING = 'UTF8'
--     LC_COLLATE = 'Russian_Russia.1251'
--     LC_CTYPE = 'Russian_Russia.1251'
--     LOCALE_PROVIDER = 'libc'
--     TABLESPACE = pg_default
--     CONNECTION LIMIT = -1
--     IS_TEMPLATE = False;

-- ======================================================================
-- 2. Таблица Server
-- ======================================================================

CREATE TABLE IF NOT EXISTS public."Server"
(
    id         SERIAL PRIMARY KEY,
    hostname   VARCHAR(255) NOT NULL,
    ip         VARCHAR(255) NOT NULL,
    location   VARCHAR(50),
    "portFree" INTEGER DEFAULT 8443,
    "portPremium" INTEGER DEFAULT 9443,
    port       INTEGER,                  -- общий порт, который мы сейчас используем
    status     VARCHAR(20) DEFAULT 'active',
    CONSTRAINT "Server_ip_key" UNIQUE (ip)
);

ALTER TABLE IF EXISTS public."Server"
    OWNER TO postgres;

-- ======================================================================
-- 3. Таблица User
-- ======================================================================

CREATE TABLE IF NOT EXISTS public."User"
(
    id          SERIAL PRIMARY KEY,
    "telegramId" BIGINT NOT NULL,
    username    VARCHAR(255),
    plan        VARCHAR(20) DEFAULT 'free',
    status      VARCHAR(20) DEFAULT 'active',
    "createdAt" TIMESTAMP DEFAULT now(),
    "expiresAt" TIMESTAMP,
    CONSTRAINT "User_telegramId_key" UNIQUE ("telegramId"),
    CONSTRAINT user_telegramid_unique UNIQUE ("telegramId")
);

ALTER TABLE IF EXISTS public."User"
    OWNER TO postgres;

-- Дополнительные поля для профиля и аналитики
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS language VARCHAR(10),      -- 'ru', 'en'
  ADD COLUMN IF NOT EXISTS country VARCHAR(2),        -- 'KZ', 'RU'
  ADD COLUMN IF NOT EXISTS ref_code VARCHAR(32),      -- код твоей рефералки
  ADD COLUMN IF NOT EXISTS referred_by VARCHAR(32),   -- кто пригласил
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS last_key_at TIMESTAMP;

-- ======================================================================
-- 4. Таблица VpnKey
-- ======================================================================

CREATE TABLE IF NOT EXISTS public."VpnKey"
(
    id           SERIAL PRIMARY KEY,
    "userId"     INTEGER,
    "serverId"   INTEGER,
    uuid         VARCHAR(255) NOT NULL,
    "shortId"    VARCHAR(32)  NOT NULL,
    sni          VARCHAR(255) NOT NULL,
    port         INTEGER      NOT NULL,
    status       VARCHAR(20)  DEFAULT 'active',
    "trafficUsed" BIGINT      DEFAULT 0,
    "createdAt"  TIMESTAMP    DEFAULT now(),
    "expiresAt"  TIMESTAMP,
    CONSTRAINT "VpnKey_uuid_key" UNIQUE (uuid),
    CONSTRAINT "VpnKey_serverId_fkey" FOREIGN KEY ("serverId")
        REFERENCES public."Server" (id)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION,
    CONSTRAINT "VpnKey_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES public."User" (id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION
);

ALTER TABLE IF EXISTS public."VpnKey"
    OWNER TO postgres;

-- Индекс по userId для ускорения поиска ключей пользователя
CREATE INDEX IF NOT EXISTS idx_vpnkey_userid ON public."VpnKey" ("userId");

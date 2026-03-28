-- 001_init.sql
-- Минимальная инициализация: только таблица User

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
-- Таблица User
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

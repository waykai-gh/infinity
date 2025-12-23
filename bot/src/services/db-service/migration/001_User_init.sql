ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS language VARCHAR(10),      -- 'ru', 'en'
  ADD COLUMN IF NOT EXISTS country VARCHAR(2),        -- 'KZ', 'RU'
  ADD COLUMN IF NOT EXISTS ref_code VARCHAR(32),      -- твой реф-код
  ADD COLUMN IF NOT EXISTS referred_by VARCHAR(32),   -- кто пригласил
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS last_key_at TIMESTAMP;
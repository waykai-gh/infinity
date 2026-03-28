-- Таблица пулов доступа по тарифу (VLESS, DNS, Hysteria2)

CREATE TABLE IF NOT EXISTS public."VpnKey"
(
    id          SERIAL PRIMARY KEY,
    kind        VARCHAR(20) NOT NULL
        CHECK (kind IN ('vless', 'dns', 'hysteria2')),
    tier        VARCHAR(20) NOT NULL
        CHECK (tier IN ('admin', 'test', 'friend', 'free')),
    value       TEXT NOT NULL,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vpnkey_tier_kind
    ON public."VpnKey" (tier, kind);

CREATE INDEX IF NOT EXISTS idx_vpnkey_tier_kind_sort
    ON public."VpnKey" (tier, kind, sort_order);

ALTER TABLE IF EXISTS public."VpnKey"
    OWNER TO postgres;

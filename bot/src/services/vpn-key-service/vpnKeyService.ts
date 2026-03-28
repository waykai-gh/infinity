import { pool } from '../db-service/db.js';
import type { Tier } from '../../types/tier.js';

export type AccessKind = 'vless' | 'dns' | 'hysteria2';

function emptyByTier(): Record<Tier, string[]> {
  return { admin: [], test: [], friend: [], free: [] };
}

/** Все строки из «VpnKey», сгруппированные по виду и тарифу (порядок: sort_order, id). */
export async function loadAllVpnKeysFromDb(): Promise<{
  vless: Record<Tier, string[]>;
  dns: Record<Tier, string[]>;
  hysteria2: Record<Tier, string[]>;
}> {
  const r = await pool.query<{ kind: string; tier: string; value: string }>(
    `SELECT kind, tier, value FROM "VpnKey" ORDER BY tier, kind, sort_order ASC, id ASC`,
  );
  const vless = emptyByTier();
  const dns = emptyByTier();
  const hysteria2 = emptyByTier();
  const byKind: Record<AccessKind, Record<Tier, string[]>> = {
    vless,
    dns,
    hysteria2,
  };
  for (const row of r.rows) {
    const k = row.kind as AccessKind;
    const t = row.tier as Tier;
    const bucket = byKind[k];
    if (bucket && bucket[t] !== undefined) bucket[t].push(row.value);
  }
  return { vless, dns, hysteria2 };
}

export async function getKeysByTierAndKind(
  tier: Tier,
  kind: AccessKind,
): Promise<string[]> {
  const r = await pool.query<{ value: string }>(
    `SELECT value FROM "VpnKey" WHERE tier = $1 AND kind = $2 ORDER BY sort_order ASC, id ASC`,
    [tier, kind],
  );
  return r.rows.map((row) => row.value);
}

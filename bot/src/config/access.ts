import { loadAllVpnKeysFromDb } from '../services/vpn-key-service/vpnKeyService.js';
import type { Tier } from '../types/tier.js';

export type { Tier } from '../types/tier.js';
export type AccessConfig = {
  adminIds: Set<number>;
  testIds: Set<number>;
  friendIds: Set<number>;
  vless: Record<Tier, string[]>;
  dns: Partial<Record<Tier, string[]>>;
  hysteria2: Partial<Record<Tier, string[]>>;
};

let cached: AccessConfig | null = null;
/** Снимок «VpnKey»; null если БД недоступна или prefetch не вызывали. */
let dbVpnSnapshot: Awaited<ReturnType<typeof loadAllVpnKeysFromDb>> | null = null;

function parseIdSet(value: string | undefined): Set<number> {
  if (!value) return new Set();
  return new Set(
    value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n)),
  );
}

function parseMultiline(value: string | undefined): string[] {
  if (!value) return [];
  const normalized = value.includes('\n') ? value : value.replace(/\\n/g, '\n');
  return normalized
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseTierLinks(prefix: 'VLESS' | 'DNS' | 'HYSTERIA2', tier: Tier): string[] {
  return parseMultiline(process.env[`${prefix}_${tier.toUpperCase()}`]);
}

const ALL_TIERS: Tier[] = ['admin', 'test', 'friend', 'free'];

/** Для строк из .env: по тарифу берём БД, если есть хотя бы одна строка, иначе ENV. */
function mergeVlessFromDb(
  env: Record<Tier, string[]>,
  db: Partial<Record<Tier, string[]>> | undefined | null,
): Record<Tier, string[]> {
  const out = {} as Record<Tier, string[]>;
  for (const t of ALL_TIERS) {
    const dbList = db?.[t];
    out[t] = dbList && dbList.length ? [...dbList] : [...(env[t] ?? [])];
  }
  return out;
}

function mergeDnsHy2FromDb(
  env: Partial<Record<Tier, string[]>>,
  db: Partial<Record<Tier, string[]>> | undefined | null,
): Partial<Record<Tier, string[]>> {
  const out: Partial<Record<Tier, string[]>> = {};
  for (const t of ALL_TIERS) {
    const dbList = db?.[t];
    const envList = env[t] ?? [];
    out[t] = dbList && dbList.length ? [...dbList] : [...envList];
  }
  return out;
}

/** Загрузить «VpnKey» в память перед первым вызовом loadAccessConfig (например при старте бота). */
export async function prefetchAccessDatabase(): Promise<void> {
  try {
    dbVpnSnapshot = await loadAllVpnKeysFromDb();
  } catch (e) {
    console.error('prefetchAccessDatabase: не удалось прочитать "VpnKey":', e);
    dbVpnSnapshot = null;
  }
}

export function loadAccessConfig(forceReload = false): AccessConfig {
  if (cached && !forceReload) return cached;

  const adminIds = parseIdSet(process.env.ADMIN_IDS);
  const testIds = parseIdSet(process.env.TEST_IDS);
  const friendIds = parseIdSet(process.env.FRIEND_IDS);

  const envVless = {
    admin: parseTierLinks('VLESS', 'admin'),
    test: parseTierLinks('VLESS', 'test'),
    friend: parseTierLinks('VLESS', 'friend'),
    free: parseTierLinks('VLESS', 'free'),
  } satisfies Record<Tier, string[]>;

  const envDns: Partial<Record<Tier, string[]>> = {
    admin: parseTierLinks('DNS', 'admin'),
    test: parseTierLinks('DNS', 'test'),
    friend: parseTierLinks('DNS', 'friend'),
    free: parseTierLinks('DNS', 'free'),
  };
  const envHysteria2: Partial<Record<Tier, string[]>> = {
    admin: parseTierLinks('HYSTERIA2', 'admin'),
    test: parseTierLinks('HYSTERIA2', 'test'),
    friend: parseTierLinks('HYSTERIA2', 'friend'),
    free: parseTierLinks('HYSTERIA2', 'free'),
  };

  const vless = mergeVlessFromDb(envVless, dbVpnSnapshot?.vless);
  const dns = mergeDnsHy2FromDb(envDns, dbVpnSnapshot?.dns);
  const hysteria2 = mergeDnsHy2FromDb(envHysteria2, dbVpnSnapshot?.hysteria2);

  cached = { adminIds, testIds, friendIds, vless, dns, hysteria2 };

  if (cached.vless.free.length === 0) {
    throw new Error(
      'Нет VLESS для тарифа free: задайте VLESS_FREE в .env или строки в таблице "VpnKey" (kind=vless, tier=free).',
    );
  }

  return cached;
}

export function resolveTier(telegramId: number): Tier {
  const cfg = loadAccessConfig();
  if (cfg.adminIds.has(telegramId)) return 'admin';
  if (cfg.testIds.has(telegramId)) return 'test';
  if (cfg.friendIds.has(telegramId)) return 'friend';
  return 'free';
}

export function getVlessLinks(telegramId: number): string[] {
  const cfg = loadAccessConfig();
  const tier = resolveTier(telegramId);
  return cfg.vless[tier].length ? cfg.vless[tier] : cfg.vless.free;
}

export function getDnsServers(telegramId: number): string[] {
  const cfg = loadAccessConfig();
  const tier = resolveTier(telegramId);
  const tierDns = cfg.dns[tier] ?? [];
  const freeDns = cfg.dns.free ?? [];
  return tierDns.length ? tierDns : freeDns;
}

export function getHysteria2Configs(telegramId: number): string[] {
  const cfg = loadAccessConfig();
  const tier = resolveTier(telegramId);
  const tierHy2 = cfg.hysteria2[tier] ?? [];
  const freeHy2 = cfg.hysteria2.free ?? [];
  return tierHy2.length ? tierHy2 : freeHy2;
}

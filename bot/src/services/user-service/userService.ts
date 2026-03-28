// src/services/user-service/userService.ts
import { pool } from '../db-service/db.js';
import crypto from 'crypto';
import { resolveTier, type Tier } from '../../config/access.js';

function generateRefCode(): string {
  // 8 символов A-Z0-9
  return crypto.randomBytes(6).toString('base64url').slice(0, 8).toUpperCase();
}

export class UserService {
  static async findOrCreateByTelegram(
    telegramId: number,
    username?: string,
    languageCode?: string,
    referralInput?: string | null,
  ) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const tier: Tier = resolveTier(telegramId);

      // 1. Ищем пользователя
      const existing = await client.query(
        `SELECT * FROM "User" WHERE "telegramId" = $1`,
        [telegramId],
      );

      if (existing.rows.length > 0) {
        const updated = await client.query(
          `UPDATE "User"
           SET last_login_at = NOW(),
               username = COALESCE($2, username),
               language = COALESCE($3, language),
               plan = $4
           WHERE "telegramId" = $1
           RETURNING *`,
          [telegramId, username ?? null, languageCode ?? null, tier],
        );

        await client.query('COMMIT');
        return updated.rows[0];
      }

      // 2. Обрабатываем реферальный код, если он передан
      let referredBy: string | null = null;
      if (referralInput) {
        const ref = await client.query(
          `SELECT ref_code FROM "User" WHERE ref_code = $1`,
          [referralInput],
        );
        if (ref.rows.length > 0) {
          referredBy = referralInput;
        }
      }

      // 3. Генерируем личный реф-код
      const refCode = generateRefCode();

      // 4. Создаём пользователя
      const insert = await client.query(
        `INSERT INTO "User"
         ("telegramId", username, plan, status, language,
          ref_code, referred_by, last_login_at)
         VALUES ($1, $2, $3, 'active', $4, $5, $6, NOW())
         RETURNING *`,
        [telegramId, username ?? null, tier, languageCode ?? null, refCode, referredBy],
      );



      await client.query('COMMIT');
      return insert.rows[0];
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}



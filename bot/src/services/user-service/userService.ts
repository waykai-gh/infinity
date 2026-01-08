// src/services/user-service/userService.ts
import { pool } from '../db-service/db.js';
import crypto from 'crypto';

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

      // 1. Ищем пользователя
      const existing = await client.query(
        `SELECT * FROM "User" WHERE "telegramId" = $1`,
        [telegramId],
      );

      if (existing.rows.length > 0) {
        const user = existing.rows[0];
        console.log(user);

        await client.query(
          `UPDATE "User"
           SET last_login_at = NOW(),
               username = COALESCE($2, username),
               language = COALESCE($3, language)
           WHERE "telegramId" = $1`,
          [telegramId, username ?? null, languageCode ?? null],
        );

        await client.query('COMMIT');
        return user;
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
         VALUES ($1, $2, 'free', 'active', $3, $4, $5, NOW())
         RETURNING *`,
        [telegramId, username ?? null, languageCode ?? null, refCode, referredBy],
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
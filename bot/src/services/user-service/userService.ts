// src/services/user-service/userService.ts
import { pool } from '../db-service/db.js';

export class UserService {
  static async findOrCreateByTelegram(telegramId: number, username?: string) {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT * FROM "User" WHERE "telegramId" = $1`,
        [telegramId],
      );

      if (rows.length > 0) return rows[0];

      const insert = await client.query(
        `INSERT INTO "User" ("telegramId", username, plan, status)
         VALUES ($1, $2, 'free', 'active')
         RETURNING *`,
        [telegramId, username ?? null],
      );

      return insert.rows[0];
    } finally {
      client.release();
    }
  }
}

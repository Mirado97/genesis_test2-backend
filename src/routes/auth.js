// src/routes/auth.js
// POST /api/auth/telegram — валидация initData и выдача JWT

const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const router = express.Router();

// ─────────────────────────────────────────────
// Утилита: валидация Telegram initData
// Документация: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
// ─────────────────────────────────────────────

/**
 * Проверяет подпись initData от Telegram Mini App.
 *
 * Алгоритм:
 * 1. Парсим строку initData в Map ключ=значение
 * 2. Извлекаем hash, убираем его из набора
 * 3. Сортируем оставшиеся пары по ключу алфавитно
 * 4. Собираем data_check_string через \n
 * 5. Вычисляем HMAC-SHA256(data_check_string, key=HMAC-SHA256(botToken, "WebAppData"))
 * 6. Сравниваем с hash из initData (constant-time)
 *
 * @param {string} initData — строка из window.Telegram.WebApp.initData
 * @returns {{ valid: boolean, user: object|null, authDate: number }}
 */
function validateTelegramInitData(initData) {
  const params = new URLSearchParams(initData);

  const hash = params.get('hash');
  if (!hash) return { valid: false, user: null, authDate: 0 };

  // Удаляем hash из проверяемых параметров
  params.delete('hash');

  // Сортируем и собираем строку для проверки
  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  // Секретный ключ: HMAC-SHA256(botToken, "WebAppData")
  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(process.env.TELEGRAM_BOT_TOKEN)
    .digest();

  // Подпись данных
  const expectedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  // Сравнение без timing-атак
  const valid = crypto.timingSafeEqual(
    Buffer.from(expectedHash, 'hex'),
    Buffer.from(hash, 'hex')
  );

  if (!valid) return { valid: false, user: null, authDate: 0 };

  // Парсим данные пользователя
  const userRaw = params.get('user');
  const authDate = parseInt(params.get('auth_date') || '0', 10);

  let user = null;
  try {
    user = JSON.parse(userRaw);
  } catch {
    return { valid: false, user: null, authDate: 0 };
  }

  return { valid: true, user, authDate };
}

// ─────────────────────────────────────────────
// POST /api/auth/telegram
// Body: { initData: string }
// ─────────────────────────────────────────────

router.post('/telegram', async (req, res) => {
  try {
    const { initData } = req.body;

    if (!initData || typeof initData !== 'string') {
      return res.status(400).json({ error: 'Bad Request', message: 'initData обязателен' });
    }

    // 1. Валидируем подпись
    const { valid, user: tgUser, authDate } = validateTelegramInitData(initData);

    if (!valid) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Невалидная подпись Telegram' });
    }

    // 2. Проверяем свежесть данных (не старше 10 минут)
    const maxAge = 10 * 60; // секунды
    if (Math.floor(Date.now() / 1000) - authDate > maxAge) {
      return res.status(401).json({ error: 'Unauthorized', message: 'initData устарел, повторите авторизацию' });
    }

    // 3. Upsert пользователя в БД
    // При повторном входе обновляем имя/username (мог измениться в Telegram)
    const { rows } = await db.query(
      `INSERT INTO users (tg_id, first_name, last_name, username, photo_url)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (tg_id) DO UPDATE SET
         first_name = EXCLUDED.first_name,
         last_name  = EXCLUDED.last_name,
         username   = EXCLUDED.username,
         photo_url  = EXCLUDED.photo_url
       RETURNING id, tg_id, first_name, last_name, username`,
      [
        tgUser.id,
        tgUser.first_name,
        tgUser.last_name || null,
        tgUser.username  || null,
        tgUser.photo_url || null,
      ]
    );

    const dbUser = rows[0];

    // 4. Генерируем JWT
    const payload = {
      userId:   dbUser.id,
      tgId:     dbUser.tg_id,
      username: dbUser.username,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    // 5. Возвращаем токен и базовый профиль
    return res.json({
      token,
      user: {
        id:         dbUser.id,
        tgId:       String(dbUser.tg_id), // BigInt → string (безопасно для JS)
        firstName:  dbUser.first_name,
        lastName:   dbUser.last_name,
        username:   dbUser.username,
      },
    });
  } catch (err) {
    console.error('[auth/telegram] Error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;

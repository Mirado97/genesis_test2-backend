// src/routes/wallet.js
// POST /api/wallet  — привязка EVM-кошелька
// GET  /api/wallet  — получить текущий кошелёк пользователя

const express = require('express');
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Все роуты требуют авторизации
router.use(authMiddleware);

// ─────────────────────────────────────────────
// Валидация EVM-адреса (простая проверка формата)
// ─────────────────────────────────────────────
function isValidEvmAddress(addr) {
  return typeof addr === 'string' && /^0x[0-9a-fA-F]{40}$/.test(addr);
}

// ─────────────────────────────────────────────
// GET /api/wallet
// Возвращает текущий привязанный кошелёк
// ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, chain_type, address, created_at
       FROM wallets
       WHERE user_id = $1 AND chain_type = 'evm'`,
      [req.user.userId]
    );

    if (rows.length === 0) {
      return res.json({ wallet: null });
    }

    return res.json({ wallet: rows[0] });
  } catch (err) {
    console.error('[wallet/GET] Error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ─────────────────────────────────────────────
// POST /api/wallet
// Body: { chain_type: "evm", address: "0x..." }
//
// Логика: UPSERT — если кошелёк уже привязан,
// обновляем адрес (пользователь может поменять кошелёк).
// Уникальность адреса НЕ глобальная — один адрес
// может быть у разных пользователей (допустимо для демо).
// ─────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { chain_type = 'evm', address } = req.body;

    // Валидация chain_type
    const allowedChains = ['evm'];
    if (!allowedChains.includes(chain_type)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `chain_type должен быть одним из: ${allowedChains.join(', ')}`,
      });
    }

    // Валидация адреса
    if (!isValidEvmAddress(address)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Неверный формат EVM-адреса (ожидается 0x + 40 hex символов)',
      });
    }

    // Нормализуем адрес в нижний регистр (стандарт EIP-55 игнорируем для простоты)
    const normalizedAddress = address.toLowerCase();

    // UPSERT: вставляем или обновляем адрес при конфликте по (user_id, chain_type)
    const { rows } = await db.query(
      `INSERT INTO wallets (user_id, chain_type, address)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, chain_type) DO UPDATE SET address = EXCLUDED.address
       RETURNING id, chain_type, address, created_at`,
      [req.user.userId, chain_type, normalizedAddress]
    );

    return res.json({
      message: 'Кошелёк успешно привязан',
      wallet: rows[0],
    });
  } catch (err) {
    console.error('[wallet/POST] Error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/wallet
// Отвязать EVM-кошелёк
// ─────────────────────────────────────────────
router.delete('/', async (req, res) => {
  try {
    const { rowCount } = await db.query(
      `DELETE FROM wallets WHERE user_id = $1 AND chain_type = 'evm'`,
      [req.user.userId]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Not Found', message: 'Кошелёк не найден' });
    }

    return res.json({ message: 'Кошелёк отвязан' });
  } catch (err) {
    console.error('[wallet/DELETE] Error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;

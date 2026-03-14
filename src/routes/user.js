// src/routes/user.js
// GET /api/user/me — профиль текущего пользователя с кошельком

const express = require('express');
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/me', async (req, res) => {
  try {
    // Достаём пользователя и его кошелёк одним запросом (LEFT JOIN)
    const { rows } = await db.query(
      `SELECT
         u.id,
         u.tg_id,
         u.first_name,
         u.last_name,
         u.username,
         u.photo_url,
         u.created_at,
         w.chain_type   AS wallet_chain,
         w.address      AS wallet_address
       FROM users u
       LEFT JOIN wallets w ON w.user_id = u.id AND w.chain_type = 'evm'
       WHERE u.id = $1`,
      [req.user.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Not Found', message: 'Пользователь не найден' });
    }

    const u = rows[0];

    return res.json({
      id:        u.id,
      tgId:      String(u.tg_id),
      firstName: u.first_name,
      lastName:  u.last_name,
      username:  u.username,
      photoUrl:  u.photo_url,
      createdAt: u.created_at,
      wallet: u.wallet_address
        ? { chainType: u.wallet_chain, address: u.wallet_address }
        : null,
    });
  } catch (err) {
    console.error('[user/me] Error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;

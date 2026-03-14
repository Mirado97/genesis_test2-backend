// src/routes/nfts.js
// GET /api/nfts        — список всех NFT
// GET /api/nfts/:id    — детали одного NFT

const express = require('express');
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Список NFT доступен без авторизации (публичная витрина)
router.get('/', async (req, res) => {
  try {
    const { for_sale } = req.query;

    let query = `
      SELECT
        n.id, n.token_id, n.contract, n.name, n.description,
        n.image_url, n.price_eth, n.for_sale,
        u.username AS owner_username,
        u.first_name AS owner_first_name
      FROM nfts n
      LEFT JOIN users u ON u.id = n.owner_id
    `;
    const params = [];

    // Опциональная фильтрация по статусу продажи
    if (for_sale === 'true') {
      query += ' WHERE n.for_sale = TRUE';
    }

    query += ' ORDER BY n.id ASC';

    const { rows } = await db.query(query, params);
    return res.json({ nfts: rows, total: rows.length });
  } catch (err) {
    console.error('[nfts/GET] Error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT
         n.*, u.username AS owner_username, u.first_name AS owner_first_name
       FROM nfts n
       LEFT JOIN users u ON u.id = n.owner_id
       WHERE n.id = $1`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Not Found' });
    }

    return res.json({ nft: rows[0] });
  } catch (err) {
    console.error('[nfts/GET/:id] Error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;

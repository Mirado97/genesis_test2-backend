// src/app.js
// Точка входа — Express приложение

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes   = require('./routes/auth');
const walletRoutes = require('./routes/wallet');
const userRoutes   = require('./routes/user');
const nftRoutes    = require('./routes/nfts');

const app = express();
const PORT = process.env.PORT || 4000;

// ─── Middleware ───────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Логирование запросов в dev-режиме
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`→ ${req.method} ${req.path}`);
    next();
  });
}

// ─── Роуты ───────────────────────────────────
app.use('/api/auth',   authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/user',   userRoutes);
app.use('/api/nfts',   nftRoutes);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));

// 404 handler
app.use((_req, res) => res.status(404).json({ error: 'Not Found' }));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// ─── Старт ───────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 NFT Marketplace API running on http://localhost:${PORT}`);
  console.log(`   Telegram auth: POST http://localhost:${PORT}/api/auth/telegram`);
  console.log(`   Wallet bind:   POST http://localhost:${PORT}/api/wallet`);
  console.log(`   NFT list:      GET  http://localhost:${PORT}/api/nfts`);
});

module.exports = app;

// src/config/database.js
// Подключение к PostgreSQL через пул соединений (pg.Pool)

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Базовые настройки пула
  max: 10,                // максимум одновременных соединений
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Проверяем соединение при старте
pool.on('connect', () => {
  console.log('✅ PostgreSQL connected');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL error:', err);
  process.exit(-1);
});

/**
 * Удобная обёртка: db.query(text, params)
 * Автоматически берёт соединение из пула и возвращает
 */
const db = {
  query: (text, params) => pool.query(text, params),
  pool,
};

module.exports = db;

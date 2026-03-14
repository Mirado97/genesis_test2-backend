// Запускает миграцию БД
// Использование: node migrate.js

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// ВСТАВЬ СВОЙ DATABASE_PUBLIC_URL СЮДА:
const DATABASE_URL = 'postgresql://postgres:qygBTbcYUDoNjOrhpjcTMABsbqKqGOYz@maglev.proxy.rlwy.net:56237/railway';

async function migrate() {
  const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

  try {
    const sql = fs.readFileSync(
      path.join(__dirname, 'migrations', '001_init.sql'),
      'utf8'
    );

    console.log('Запускаю миграцию...');
    await pool.query(sql);
    console.log('✅ Миграция выполнена успешно!');

  } catch (err) {
    console.error('❌ Ошибка миграции:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();

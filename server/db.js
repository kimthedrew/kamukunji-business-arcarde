const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.on('error', (err) => {
  console.error('Database pool error:', err.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};

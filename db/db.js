const dotenv = require('dotenv');
const { Pool } = require('pg');

dotenv.config();  // Load .env variables

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
});

async function testConnection() {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('Database connected successfully.');
  } catch (err) {
    console.error('Database connection error:', err);
  }
}

testConnection();

module.exports = pool;

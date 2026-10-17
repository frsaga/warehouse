require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
async function main() {
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  if (!password || password.length < 12) throw new Error('Set INITIAL_ADMIN_PASSWORD to your own password of at least 12 characters.');
  const db = await mysql.createConnection({host: process.env.DB_HOST || '127.0.0.1', user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', database: process.env.DB_NAME || 'warehouse'});
  const hash = await bcrypt.hash(password, 10);
  await db.execute('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [process.env.INITIAL_ADMIN_USERNAME || 'admin', hash, 'superadmin']);
  await db.end();
  console.log('Local administrator created.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });

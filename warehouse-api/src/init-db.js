require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('node:fs');
const path = require('node:path');
async function main() {
  const name = process.env.DB_NAME || 'warehouse';
  if (!/^[a-zA-Z0-9_]+$/.test(name)) throw new Error('Invalid DB_NAME');
  const db = await mysql.createConnection({host: process.env.DB_HOST || '127.0.0.1', user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', multipleStatements: true});
  await db.query('CREATE DATABASE IF NOT EXISTS `' + name + '`');
  await db.query('USE `' + name + '`');
  await db.query(fs.readFileSync(path.join(__dirname, '../schema.sql'), 'utf8'));
  await db.end();
  console.log('Schema created; no original business or account data imported.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });

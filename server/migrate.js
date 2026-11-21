import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { config } from './config.js';

if (!config.databaseUrl) throw new Error('Defina DATABASE_URL antes de executar a migração.');
const sql = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
const pool = new pg.Pool({ connectionString: config.databaseUrl, ssl: config.databaseSsl ? { rejectUnauthorized: false } : false });
await pool.query(sql);
await pool.end();
console.log('Banco de dados atualizado com sucesso.');

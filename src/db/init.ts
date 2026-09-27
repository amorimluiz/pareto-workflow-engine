import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pool } from './index.js';

const schemaPath = fileURLToPath(new URL('./schema.sql', import.meta.url));

try {
  const schema = await readFile(schemaPath, 'utf8');
  await pool.query(schema);
  console.log('Schema aplicado com sucesso.');
} catch (error) {
  console.error('Falha ao aplicar o schema:', error);
  process.exitCode = 1;
} finally {
  await pool.end();
}

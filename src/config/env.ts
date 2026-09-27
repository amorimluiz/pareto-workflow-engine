import { existsSync } from 'node:fs';

if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL nao definida. Copie .env.example para .env antes de rodar os scripts.');
}

export const env = {
  databaseUrl,
  port: Number(process.env.PORT ?? 3000),
};

import { PgBoss } from 'pg-boss';
import { env } from '../config/env.js';

export const PIPELINE_QUEUE = 'pipeline-queue';

export const queue = new PgBoss({
  connectionString: env.databaseUrl,
  useListenNotify: true,
});

queue.on('error', (error: unknown) => {
  console.error('[pg-boss] Erro interno:', error);
});

export async function startQueue(): Promise<PgBoss> {
  await queue.start();
  await queue.createQueue(PIPELINE_QUEUE, { notify: true });

  return queue;
}

export async function stopQueue(): Promise<void> {
  await queue.stop();
}

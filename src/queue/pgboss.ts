import { PgBoss } from 'pg-boss';
import { env } from '../config/env.js';

export const PIPELINES_QUEUE = 'pipelines';

export function createQueue(): PgBoss {
  return new PgBoss({ connectionString: env.databaseUrl });
}

export async function startQueue(queue: PgBoss): Promise<void> {
  await queue.start();
  // TODO: Implementar workers e queues com pg-boss respeitando o scheduled_at
}

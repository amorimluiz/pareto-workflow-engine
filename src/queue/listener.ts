import type { JobInsert } from 'pg-boss';
import { Client } from 'pg';
import { env } from '../config/env.js';
import { PIPELINE_QUEUE, queue, startQueue } from './pgboss.js';

const OUTBOX_CHANNEL = 'pipeline_created';
const BATCH_SIZE = 1000;
const FLUSH_INTERVAL_MS = 20;
const RETRY_INTERVAL_MS = 1000;

interface PipelineCreatedEvent {
  id: string;
  scheduled_at: string;
}

interface PipelineJobData {
  pipelineId: string;
}

let buffer: JobInsert<PipelineJobData>[] = [];
let flushTimer: NodeJS.Timeout | null = null;
let flushing = false;

function triggerFlush(): void {
  void flushBuffer().catch((error: unknown) => {
    console.error('[outbox] Erro inesperado no flush:', error);
  });
}

function scheduleFlush(delayMs: number): void {
  if (flushTimer !== null || flushing) {
    return;
  }

  flushTimer = setTimeout(() => {
    flushTimer = null;
    triggerFlush();
  }, delayMs);
}

async function flushBuffer(): Promise<void> {
  if (flushing) {
    return;
  }

  flushing = true;
  let retryNeeded = false;

  try {
    while (buffer.length > 0) {
      const batch = buffer;
      buffer = [];

      try {
        await queue.insert(PIPELINE_QUEUE, batch);
      } catch (error) {
        buffer = batch.concat(buffer);
        retryNeeded = true;
        console.error(`[outbox] Falha ao enfileirar lote de ${batch.length} jobs:`, error);
        break;
      }
    }
  } finally {
    flushing = false;
  }

  if (retryNeeded) {
    scheduleFlush(RETRY_INTERVAL_MS);
  }
}

function enqueueNotification(payload: string | undefined): void {
  if (!payload) {
    return;
  }

  let event: Partial<PipelineCreatedEvent>;
  try {
    event = JSON.parse(payload) as Partial<PipelineCreatedEvent>;
  } catch {
    console.error('[outbox] Payload invalido recebido:', payload);
    return;
  }

  if (typeof event.id !== 'string' || typeof event.scheduled_at !== 'string') {
    console.error('[outbox] Payload invalido recebido:', payload);
    return;
  }

  buffer.push({
    data: { pipelineId: event.id },
    startAfter: new Date(event.scheduled_at),
  });

  if (buffer.length >= BATCH_SIZE) {
    triggerFlush();
    return;
  }

  scheduleFlush(FLUSH_INTERVAL_MS);
}

export async function startListener(): Promise<void> {
  await startQueue();

  const client = new Client({ connectionString: env.databaseUrl });

  client.on('error', (error: Error) => {
    console.error('[outbox] Erro na conexao do listener:', error);
  });

  client.on('notification', (message) => {
    enqueueNotification(message.payload);
  });

  await client.connect();
  await client.query(`LISTEN ${OUTBOX_CHANNEL}`);

  console.log(`[outbox] Listener ativo no canal "${OUTBOX_CHANNEL}".`);
}

import { Client } from 'pg';
import { env } from '../config/env.js';
import { PIPELINE_QUEUE, queue, startQueue } from './pgboss.js';

const OUTBOX_CHANNEL = 'pipeline_created';

interface PipelineCreatedEvent {
  id: string;
  scheduled_at: string;
}

async function relayPipelineCreated(payload: string | undefined): Promise<void> {
  if (!payload) {
    return;
  }

  const event = JSON.parse(payload) as Partial<PipelineCreatedEvent>;

  if (typeof event.id !== 'string' || typeof event.scheduled_at !== 'string') {
    console.error('[outbox] Payload invalido recebido:', payload);
    return;
  }

  await queue.send(
    PIPELINE_QUEUE,
    { pipelineId: event.id },
    { startAfter: new Date(event.scheduled_at) },
  );
}

export async function startListener(): Promise<void> {
  await startQueue();

  const client = new Client({ connectionString: env.databaseUrl });

  client.on('error', (error: Error) => {
    console.error('[outbox] Erro na conexao do listener:', error);
  });

  client.on('notification', (message) => {
    void relayPipelineCreated(message.payload).catch((error: unknown) => {
      console.error('[outbox] Falha ao enfileirar pipeline:', error);
    });
  });

  await client.connect();
  await client.query(`LISTEN ${OUTBOX_CHANNEL}`);

  console.log(`[outbox] Listener ativo no canal "${OUTBOX_CHANNEL}".`);
}

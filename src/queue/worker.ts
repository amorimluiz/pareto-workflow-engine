import type { Job } from 'pg-boss';
import { pool } from '../db/index.js';
import { executePipelines } from '../engine/executor.js';
import { PIPELINE_QUEUE, startQueue } from './pgboss.js';

interface PipelineJobData {
  pipelineId: string;
}

const WORK_OPTIONS = {
  localConcurrency: 5,
  batchSize: 100,
  burstWhenBatchFull: true,
  notifyPollingIntervalSeconds: 5,
} as const;

async function handlePipelineJobs(jobs: Job<PipelineJobData>[]): Promise<void> {
  const pipelineIds = jobs.map((job) => job.data.pipelineId);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await executePipelines(client, pipelineIds);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`[worker] Falha ao processar lote de ${pipelineIds.length} pipelines:`, error);
    throw error;
  } finally {
    client.release();
  }
}

export async function startWorker(): Promise<void> {
  const boss = await startQueue();

  await boss.work<PipelineJobData>(PIPELINE_QUEUE, WORK_OPTIONS, handlePipelineJobs);

  console.log(`[worker] Workers registrados na fila "${PIPELINE_QUEUE}".`);
}

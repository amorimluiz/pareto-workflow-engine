import type { Job } from 'pg-boss';
import { pool } from '../db/index.js';
import { PIPELINE_QUEUE, startQueue } from './pgboss.js';

interface PipelineJobData {
  pipelineId: string;
}

const WORK_OPTIONS = {
  localConcurrency: 5,
  batchSize: 2,
} as const;

async function handlePipelineJobs(jobs: Job<PipelineJobData>[]): Promise<void> {
  for (const job of jobs) {
    const { pipelineId } = job.data;

    try {
      await pool.query('UPDATE pipelines SET status = $1 WHERE id = $2', ['RUNNING', pipelineId]);
      await pool.query('UPDATE pipelines SET status = $1 WHERE id = $2', ['COMPLETED', pipelineId]);
    } catch (error) {
      console.error(`[worker] Falha no job ${job.id} (pipeline ${pipelineId}):`, error);
      throw error;
    }
  }
}

export async function startWorker(): Promise<void> {
  const boss = await startQueue();

  await boss.work<PipelineJobData>(PIPELINE_QUEUE, WORK_OPTIONS, handlePipelineJobs);

  console.log(`[worker] Workers registrados na fila "${PIPELINE_QUEUE}".`);
}

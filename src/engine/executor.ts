import type { PoolClient } from 'pg';
import type { PipelinePayload } from '../types/pipeline.js';
import { PIPELINE_JOB_DEFINITIONS } from './jobs.js';
import { updateExecutionStatuses } from './stateMachine.js';

interface PipelineRow {
  id: string;
  payload: PipelinePayload;
}

interface JobRow {
  id: string;
  pipeline_id: string;
  step_number: number;
  name: string;
}

interface ExecutionRow {
  id: string;
  job_id: string;
}

export async function executePipelines(db: PoolClient, pipelineIds: string[]): Promise<void> {
  await db.query('UPDATE pipelines SET status = $1 WHERE id = ANY($2::uuid[])', ['RUNNING', pipelineIds]);

  const { rows: pipelines } = await db.query<PipelineRow>(
    'SELECT id, payload FROM pipelines WHERE id = ANY($1::uuid[])',
    [pipelineIds],
  );

  const { rows: jobRows } = await db.query<JobRow>(
    `INSERT INTO jobs (pipeline_id, step_number, name, status)
     SELECT p.id, s.step_number, s.name, 'PENDING'
     FROM unnest($1::uuid[]) AS p(id)
     CROSS JOIN unnest($2::int[], $3::text[]) AS s(step_number, name)
     RETURNING id, pipeline_id, step_number, name`,
    [
      pipelineIds,
      PIPELINE_JOB_DEFINITIONS.map((definition) => definition.stepNumber),
      PIPELINE_JOB_DEFINITIONS.map((definition) => definition.name),
    ],
  );

  const { rows: executionRows } = await db.query<ExecutionRow>(
    `INSERT INTO executions (job_id, status, payload_ref, expires_at)
     SELECT j.id, 'RUNNING', j.pipeline_id::text, now() + interval '15 minutes'
     FROM jobs j
     WHERE j.id = ANY($1::uuid[])
     RETURNING id, job_id`,
    [jobRows.map((row) => row.id)],
  );

  await db.query('UPDATE jobs SET status = $1 WHERE id = ANY($2::uuid[])', ['RUNNING', jobRows.map((row) => row.id)]);

  const payloadByPipelineId = new Map(pipelines.map((row) => [row.id, row.payload]));
  const definitionByStepNumber = new Map(PIPELINE_JOB_DEFINITIONS.map((definition) => [definition.stepNumber, definition]));

  jobRows.sort((left, right) => left.pipeline_id.localeCompare(right.pipeline_id) || left.step_number - right.step_number);

  for (const jobRow of jobRows) {
    const payload = payloadByPipelineId.get(jobRow.pipeline_id);
    const definition = definitionByStepNumber.get(jobRow.step_number);

    if (!payload || !definition) {
      throw new Error(`Job ${jobRow.id} sem payload ou definicao (step ${jobRow.step_number})`);
    }

    definition.process(payload);
  }

  await updateExecutionStatuses(db, executionRows.map((row) => row.id), 'RUNNING', 'COMPLETED');

  await db.query('UPDATE jobs SET status = $1 WHERE id = ANY($2::uuid[])', ['COMPLETED', jobRows.map((row) => row.id)]);
  await db.query('UPDATE pipelines SET status = $1 WHERE id = ANY($2::uuid[])', ['COMPLETED', pipelineIds]);
}

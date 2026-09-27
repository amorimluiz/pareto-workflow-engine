import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pool } from '../db/index.js';
import { createPipelinesBulk } from '../services/pipeline.service.js';
import type { PipelineInput } from '../types/pipeline.js';

const datasetPath = fileURLToPath(new URL('../../data/bulk_payload_100k.json', import.meta.url));

async function main(): Promise<void> {
  const raw = await readFile(datasetPath, 'utf8');
  const pipelines = JSON.parse(raw) as PipelineInput[];

  console.log(`Ingerindo ${pipelines.length} pipelines de ${datasetPath}`);
  console.time('ingest');
  try {
    await createPipelinesBulk(pipelines);
  } finally {
    console.timeEnd('ingest');
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

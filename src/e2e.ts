import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createPipelinesBulk } from './services/pipeline.service.js';
import type { PipelineInput } from './types/pipeline.js';

const datasetPath = fileURLToPath(new URL('../data/bulk_payload_100k.json', import.meta.url));

async function main(): Promise<void> {
  const raw = await readFile(datasetPath, 'utf8');
  const pipelines = JSON.parse(raw) as PipelineInput[];

  console.time('e2e');
  try {
    await createPipelinesBulk(pipelines);

    // TODO: Conectar o fluxo completo E2E para validação final
  } finally {
    console.timeEnd('e2e');
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

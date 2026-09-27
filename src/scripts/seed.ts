import { once } from 'node:events';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { PipelineInput } from '../types/pipeline.js';

const TOTAL_PIPELINES = 100_000;
const dataDirectory = new URL('../../data/', import.meta.url);
const outputFile = new URL('../../data/bulk_payload_100k.json', import.meta.url);

function buildPipeline(index: number): PipelineInput {
  const offsetFromNow = (index - TOTAL_PIPELINES / 2) * 1000;
  return {
    scheduled_at: new Date(Date.now() + offsetFromNow).toISOString(),
    payload: {
      cliente_id: index + 1,
      items: [{ sku: `SKU-${String(index % 5_000).padStart(5, '0')}`, quantity: (index % 9) + 1 }],
    },
  };
}

async function writeDataset(): Promise<void> {
  await mkdir(dataDirectory, { recursive: true });

  const stream = createWriteStream(outputFile, { encoding: 'utf8' });
  stream.write('[');

  for (let index = 0; index < TOTAL_PIPELINES; index += 1) {
    const separator = index === 0 ? '' : ',';
    if (!stream.write(`${separator}${JSON.stringify(buildPipeline(index))}`)) {
      await once(stream, 'drain');
    }
  }

  stream.end(']');
  await once(stream, 'finish');
}

console.time('seed:dataset');
await writeDataset();
console.timeEnd('seed:dataset');
console.log(`Dataset gerado em ${fileURLToPath(outputFile)}`);

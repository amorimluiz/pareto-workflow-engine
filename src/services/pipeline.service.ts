import { Readable, Transform } from 'node:stream';
import { pool } from '../db/index.js';
import type { PipelineInput } from '../types/pipeline.js';
import { from as copyFrom } from 'pg-copy-streams'

export async function createPipelinesBulk(data: PipelineInput[]): Promise<void> {
  const client = await pool.connect()

  const start = performance.now()

  try {
    const toCsv = new Transform({
      objectMode: true,

      transform(pipe: PipelineInput, _encoding, callback) {
        const row = [
          JSON.stringify(pipe.payload),
          pipe.scheduled_at
        ]

        const line = row.map(r => `"${String(r).replaceAll('"', '""')}"`).join(',')

        callback(null, line + '\n')
      }
    })

    const writeStream = client.query(
      copyFrom(`
        COPY pipelines (payload, scheduled_at)
        FROM STDIN
        WITH (FORMAT CSV, HEADER true)
      `)
    )

    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve)
      writeStream.on('error', reject)

      Readable
        .from(data)
        .pipe(toCsv)
        .pipe(writeStream)
    })
  } finally {
    const end = performance.now();
    const totalSeconds = (end - start) / 1000;
    const throughput = Math.round(data.length / totalSeconds);

    console.log(`\nMETRICAS DE INGESTÃO:`)
    console.log(`-----------------------------------`)
    console.log(`Total de Registros: ${data.length.toLocaleString()}`)
    console.log(`Tempo Total: ${totalSeconds.toFixed(2)}s`)
    console.log(`Vazão (Throughput): ${throughput.toLocaleString()} pipelines/segundo`)
    console.log(`-----------------------------------\n`)
    client.release()
  }
}

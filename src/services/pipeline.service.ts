import { Readable, Transform } from 'node:stream';
import { pool } from '../db/index.js';
import type { PipelineInput } from '../types/pipeline.js';
import { from as copyFrom } from 'pg-copy-streams'

export async function createPipelinesBulk(data: PipelineInput[]): Promise<void> {
  // TODO: Implementar ingestão ultra-rápida usando pg-copy-streams
  throw new Error('Not implemented');
}

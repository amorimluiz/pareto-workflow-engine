import type { PipelinePayload } from '../types/pipeline.js';

export interface JobDefinition {
  stepNumber: number;
  name: string;
  process: (payload: PipelinePayload) => void;
}

function validatePayload(payload: PipelinePayload): void {
  if (typeof payload.cliente_id !== 'number') {
    throw new Error('Payload invalido: cliente_id ausente');
  }

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    throw new Error('Payload invalido: items ausente ou vazio');
  }
}

function aggregateItems(payload: PipelinePayload): void {
  const totalQuantity = payload.items.reduce((total, item) => total + item.quantity, 0);

  if (totalQuantity <= 0) {
    throw new Error(`Payload invalido: quantidade total ${totalQuantity}`);
  }
}

function finalizePipeline(payload: PipelinePayload): void {
  const skus = new Set(payload.items.map((item) => item.sku));

  if (skus.size !== payload.items.length) {
    throw new Error('Payload invalido: skus duplicados');
  }
}

export const PIPELINE_JOB_DEFINITIONS: JobDefinition[] = [
  { stepNumber: 1, name: 'validate-payload', process: validatePayload },
  { stepNumber: 2, name: 'aggregate-items', process: aggregateItems },
  { stepNumber: 3, name: 'finalize-pipeline', process: finalizePipeline },
];

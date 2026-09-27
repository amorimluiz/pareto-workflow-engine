export interface PipelineInput {
  scheduled_at: string;
  payload: Record<string, unknown>;
}

export interface PipelineItem {
  sku: string;
  quantity: number;
}

export interface PipelinePayload {
  cliente_id: number;
  items: PipelineItem[];
}

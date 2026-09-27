import type { Pool, PoolClient } from 'pg';
import { pool } from '../db/index.js';

type Queryable = Pool | PoolClient;

export async function updateExecutionStatuses(
  db: Queryable,
  ids: string[],
  currentStatus: string,
  newStatus: string,
): Promise<number> {
  const result = await db.query(
    `UPDATE executions
     SET status = $3, updated_at = now()
     WHERE id = ANY($1::uuid[]) AND status = $2`,
    [ids, currentStatus, newStatus],
  );

  return result.rowCount ?? 0;
}

export async function updateExecutionStatus(
  id: string,
  currentStatus: string,
  newStatus: string,
): Promise<boolean> {
  const updated = await updateExecutionStatuses(pool, [id], currentStatus, newStatus);

  return updated === 1;
}

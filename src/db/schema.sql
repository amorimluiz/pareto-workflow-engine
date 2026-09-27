-- DDL base do pareto-workflow-engine.
-- Os valores de status sao definidos pela implementacao do motor.

CREATE TABLE IF NOT EXISTS pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payload JSONB NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  scheduled_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES pipelines (id) ON DELETE CASCADE,
  step_number INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs (id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  payload_ref VARCHAR(255),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pipelines_status_scheduled_at ON pipelines (status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_pipelines_scheduled_at ON pipelines (scheduled_at);
CREATE INDEX IF NOT EXISTS idx_jobs_pipeline_id ON jobs (pipeline_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs (status);
CREATE INDEX IF NOT EXISTS idx_executions_job_id ON executions (job_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON executions (status);

-- Transactional outbox: notifica a criacao de pipelines via LISTEN/NOTIFY.
CREATE OR REPLACE FUNCTION notify_pipeline_created()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'pipeline_created',
    json_build_object(
      'id', NEW.id,
      'scheduled_at', NEW.scheduled_at
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pipeline_created ON pipelines;

CREATE TRIGGER trg_pipeline_created
AFTER INSERT ON pipelines
FOR EACH ROW
EXECUTE FUNCTION notify_pipeline_created();

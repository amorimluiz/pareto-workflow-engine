import { startListener } from './queue/listener.js';
import { stopQueue } from './queue/pgboss.js';
import { startWorker } from './queue/worker.js';

async function main(): Promise<void> {
  await startWorker();
  await startListener();

  console.log('Runner do Desafio 2 em execucao. Ctrl+C para encerrar.');

  const shutdown = (): void => {
    void stopQueue()
      .catch((error: unknown) => console.error('Falha ao encerrar a fila:', error))
      .finally(() => process.exit(0));
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

main().catch((error: unknown) => {
  console.error('Falha ao iniciar o runner:', error);
  process.exitCode = 1;
});

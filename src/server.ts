import { createServer } from 'node:http';
import { env } from './config/env.js';

const server = createServer((request, response) => {
  // TODO: Implementar handler que recebe o JSON com o array de pipelines em lote e chama createPipelinesBulk
  response.writeHead(501, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ error: 'Not implemented' }));
});

server.listen(env.port, () => {
  console.log(`HTTP server ouvindo em http://localhost:${env.port}`);
});

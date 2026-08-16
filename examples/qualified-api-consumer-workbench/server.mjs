import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { consumerRejectedResponse, executeConsumerRequest } from './adapter.mjs';

const ROOT = fileURLToPath(new URL('./', import.meta.url));
const PUBLIC_ROOT = resolve(ROOT, 'public');
const FIXTURE_ROOT = resolve(ROOT, 'fixtures');
const MAX_REQUEST_BYTES = 1024 * 1024;

const MIME_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8']
]);

function sendJson(response, statusCode, value) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  response.end(`${JSON.stringify(value)}\n`);
}

function safePath(baseDirectory, pathname) {
  const candidate = resolve(baseDirectory, `.${pathname}`);
  const rel = relative(baseDirectory, candidate);
  if (rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))) {
    return candidate;
  }
  return null;
}

async function readRequestBody(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_REQUEST_BYTES) {
      const error = new Error('Request body exceeds the 1 MiB local Workbench limit.');
      error.code = 'request_too_large';
      throw error;
    }
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString('utf8');
}

async function serveFile(response, baseDirectory, pathname) {
  const path = safePath(baseDirectory, pathname);
  if (path === null) {
    response.writeHead(403);
    response.end('Forbidden\n');
    return;
  }

  try {
    const content = await readFile(path);
    response.writeHead(200, {
      'content-type': MIME_TYPES.get(extname(path)) ?? 'application/octet-stream',
      'cache-control': 'no-store'
    });
    response.end(content);
  } catch (error) {
    if (error?.code === 'ENOENT' || error?.code === 'EISDIR') {
      response.writeHead(404);
      response.end('Not found\n');
      return;
    }
    throw error;
  }
}

function transportRejected(message, code = 'invalid_transport_json') {
  return consumerRejectedResponse(null, [
    {
      code,
      path: '$',
      message
    }
  ]);
}

export function createWorkbenchServer() {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1');

      if (request.method === 'POST' && url.pathname === '/api/run') {
        let body;
        try {
          body = await readRequestBody(request);
        } catch (error) {
          sendJson(
            response,
            413,
            transportRejected(
              error instanceof Error ? error.message : 'Request body rejected.',
              'request_too_large'
            )
          );
          return;
        }

        let input;
        try {
          input = JSON.parse(body);
        } catch (error) {
          sendJson(
            response,
            400,
            transportRejected(
              error instanceof Error ? error.message : 'Invalid request JSON.'
            )
          );
          return;
        }

        sendJson(response, 200, executeConsumerRequest(input));
        return;
      }

      if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.writeHead(405, { allow: 'GET, HEAD, POST' });
        response.end('Method not allowed\n');
        return;
      }

      if (url.pathname.startsWith('/fixtures/')) {
        await serveFile(response, FIXTURE_ROOT, url.pathname.slice('/fixtures'.length));
        return;
      }

      const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
      await serveFile(response, PUBLIC_ROOT, pathname);
    } catch (error) {
      sendJson(response, 500, {
        schemaVersion: 1,
        kind: 'qualified_api_consumer_workbench_response',
        operation: null,
        executionBoundary: 'local_node_exact_npm_consumer',
        package: {
          name: 'universal-calc-engine',
          version: '1.1.0',
          importBoundary: 'package-name ESM root'
        },
        outcome: 'adapter_failure',
        consumerIssues: [
          {
            code: 'unexpected_server_failure',
            path: '$',
            message: error instanceof Error ? error.message : 'Unexpected local server failure.'
          }
        ],
        analyticalResult: null,
        facets: {
          failureStage: null,
          convergence: null,
          ambiguity: null,
          warnings: [],
          limitations: []
        }
      });
    }
  });
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  const port = Number.parseInt(process.env.PORT ?? '4173', 10);
  const server = createWorkbenchServer();
  server.listen(port, '127.0.0.1', () => {
    console.log(`ORF Qualified API Consumer Workbench: http://127.0.0.1:${port}`);
    console.log('Execution boundary: local Node -> universal-calc-engine@1.1.0');
  });
}

#!/usr/bin/env node
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { CaptureStore, normalizeLogSearchInput } from './store.js';

const host = process.env.NETWORK_CAPTURE_HOST || '127.0.0.1';
const port = Number(process.env.NETWORK_CAPTURE_PORT || 37777);
const maxEvents = Number(process.env.NETWORK_CAPTURE_MAX_EVENTS || 1000);
const maxBodyBytes = Number(process.env.NETWORK_CAPTURE_MAX_BODY_BYTES || 2 * 1024 * 1024);
const toolDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const storageDirectory = process.env.NETWORK_CAPTURE_STORAGE_DIR || resolve(toolDirectory, 'captures');
const store = new CaptureStore({ maxEvents, maxBodyBytes, storageDirectory });
const instanceId = crypto.randomUUID();
const startedAt = new Date().toISOString();
const commands = [];
const commandResults = new Map();

function enqueueLogSearch(body) {
  const command = { id: crypto.randomUUID(), type: 'run-log-search', body, createdAt: new Date().toISOString() };
  commands.push(command);
  return command;
}

function sendJson(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify({ instanceId, startedAt, ...body }));
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${host}:${port}`);

    if (request.method === 'GET' && url.pathname === '/health') {
      return sendJson(response, 200, { ok: true, ...store.status() });
    }

    if (request.method === 'POST' && url.pathname === '/events') {
      const event = await readJson(request);
      if (!event || typeof event !== 'object') return sendJson(response, 400, { error: 'Expected a JSON event.' });
      const stored = await store.add(event);
      return sendJson(response, 202, { accepted: true, id: stored.id || null });
    }

    if (request.method === 'POST' && url.pathname === '/log-search/requests') {
      const body = normalizeLogSearchInput(await readJson(request));
      const command = enqueueLogSearch(body);
      return sendJson(response, 202, { ...command, status: 'queued' });
    }

    if (request.method === 'GET' && url.pathname === '/commands/next') {
      return sendJson(response, 200, { command: commands.shift() || null });
    }

    if (request.method === 'POST' && url.pathname.startsWith('/commands/') && url.pathname.endsWith('/result')) {
      const id = decodeURIComponent(url.pathname.slice('/commands/'.length, -'/result'.length));
      const result = await readJson(request);
      commandResults.set(id, { ...result, completedAt: new Date().toISOString() });
      return sendJson(response, 202, { accepted: true });
    }

    if (request.method === 'GET' && url.pathname.startsWith('/commands/')) {
      const id = decodeURIComponent(url.pathname.slice('/commands/'.length));
      return sendJson(response, 200, { id, result: commandResults.get(id) || null });
    }

    if (request.method === 'GET' && url.pathname === '/captures') {
      return sendJson(response, 200, store.list({
        limit: url.searchParams.get('limit'),
        offset: url.searchParams.get('offset'),
        urlIncludes: url.searchParams.get('urlIncludes') || undefined,
        method: url.searchParams.get('method') || undefined,
        status: url.searchParams.get('status') || undefined,
        mimeType: url.searchParams.get('mimeType') || undefined,
        from: url.searchParams.get('from') || undefined,
        to: url.searchParams.get('to') || undefined,
      }));
    }

    if (request.method === 'GET' && url.pathname.startsWith('/captures/')) {
      const id = decodeURIComponent(url.pathname.slice('/captures/'.length));
      const include = (url.searchParams.get('include') || '').split(',').filter(Boolean);
      const capture = store.get(id, include);
      return capture ? sendJson(response, 200, capture) : sendJson(response, 404, { error: 'Capture not found.' });
    }

    if (request.method === 'DELETE' && url.pathname === '/captures') {
      return sendJson(response, 200, await store.clear());
    }

    return sendJson(response, 404, { error: 'Not found.' });
  } catch (error) {
    return sendJson(response, 400, { error: error.message });
  }
});

try {
  const { loaded, filesLoaded } = await store.load();
  server.listen(port, host, () => {
    console.log(`Local Network Capture listening on http://${host}:${port}`);
    console.log(`Loaded ${loaded} capture event(s) from ${filesLoaded} file(s) in ${storageDirectory}`);
  });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

#!/usr/bin/env node
import http from 'node:http';
import readline from 'node:readline';

const host = process.env.NETWORK_CAPTURE_HOST || '127.0.0.1';
const port = Number(process.env.NETWORK_CAPTURE_PORT || 37777);

function request(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request({ host, port, path, method }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        try {
          const body = JSON.parse(raw);
          if (response.statusCode >= 400) return reject(new Error(body.error || `HTTP ${response.statusCode}`));
          resolve(body);
        } catch {
          reject(new Error(`Invalid local service response: ${raw}`));
        }
      });
    });
    req.on('error', (error) => reject(new Error(`Cannot reach Local Network Capture at ${host}:${port}: ${error.message}`)));
    req.end();
  });
}

const tools = [
  {
    name: 'network_capture_status',
    description: 'Get local Chrome network-capture service status and active capture sessions.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'network_capture_list',
    description: 'List captured network requests using lightweight metadata only. Use this first, then fetch an individual capture by id.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: '1-200; defaults to 50.' },
        offset: { type: 'number', description: 'Pagination offset.' },
        urlIncludes: { type: 'string', description: 'Only requests whose URL contains this string.' },
        method: { type: 'string', description: 'HTTP method, for example GET or POST.' },
        status: { type: 'number', description: 'HTTP status code.' },
        mimeType: { type: 'string', description: 'Response MIME type substring.' },
        from: { type: 'number', description: 'Only requests completed at or after this Unix millisecond timestamp.' },
        to: { type: 'number', description: 'Only requests completed at or before this Unix millisecond timestamp.' },
      },
    },
  },
  {
    name: 'network_capture_get',
    description: 'Get selected raw components of one capture. Raw headers and bodies can contain authentication secrets and private data; request only the components needed.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string', description: 'Capture id returned by network_capture_list.' },
        include: {
          type: 'array',
          items: { type: 'string', enum: ['requestHeaders', 'requestBody', 'responseHeaders', 'responseBody', 'responseBodyBase64Encoded', 'protocol', 'remoteIPAddress', 'encodedDataLength'] },
          description: 'Explicit components to return. Defaults to no raw data.',
        },
      },
    },
  },
  {
    name: 'log_search_run',
    description: 'Queue an authorized log search for the one Chrome tab currently being captured. Chrome executes it with the browser’s existing authenticated session; no cookies are copied into the tool.',
    inputSchema: {
      type: 'object',
      required: ['appCode', 'env', 'from', 'to'],
      properties: {
        appCode: { type: 'string' }, name: { type: 'string' }, appCodes: { type: 'array', items: { type: 'string' } },
        env: { type: 'string' }, from: { type: 'number', description: 'Unix milliseconds.' }, to: { type: 'number', description: 'Unix milliseconds.' },
        q: { type: 'string', description: 'Log query expression.' }, logLevel: { type: 'string' }, logCategory: { type: 'string' },
        logTag: { type: 'string' }, namespace: { type: 'string' }, sortOrder: { type: 'string', enum: ['ASC', 'DESC'] }, isAgg: { type: 'boolean' },
      },
    },
  },
  {
    name: 'log_search_result',
    description: 'Read the result of a queued log search by command id.',
    inputSchema: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
  },
  {
    name: 'network_capture_clear',
    description: 'Clear all network captures from local memory and persisted JSONL files.',
    inputSchema: { type: 'object', properties: {} },
  },
];

function jsonRpcResult(id, result) {
  return { jsonrpc: '2.0', id, result };
}

async function handle(message) {
  const { id, method, params = {} } = message;
  if (method === 'initialize') {
    return jsonRpcResult(id, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'chrome-network-capture', version: '0.1.0' },
    });
  }
  if (method === 'notifications/initialized') return null;
  if (method === 'tools/list') return jsonRpcResult(id, { tools });
  if (method !== 'tools/call') return { jsonrpc: '2.0', id, error: { code: -32601, message: `Unsupported method: ${method}` } };

  try {
    let data;
    if (params.name === 'network_capture_status') data = await request('/health');
    else if (params.name === 'network_capture_list') {
      const query = new URLSearchParams();
      for (const key of ['limit', 'offset', 'urlIncludes', 'method', 'status', 'mimeType', 'from', 'to']) {
        if (params.arguments?.[key] !== undefined) query.set(key, String(params.arguments[key]));
      }
      data = await request(`/captures?${query}`);
    } else if (params.name === 'network_capture_get') {
      const args = params.arguments || {};
      if (!args.id) throw new Error('The id argument is required.');
      const query = new URLSearchParams();
      if (Array.isArray(args.include) && args.include.length) query.set('include', args.include.join(','));
      data = await request(`/captures/${encodeURIComponent(args.id)}?${query}`);
    } else if (params.name === 'log_search_run') {
      const body = JSON.stringify(params.arguments || {});
      data = await new Promise((resolve, reject) => {
        const req = http.request({ host, port, path: '/log-search/requests', method: 'POST', headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) } }, (response) => {
          const chunks = [];
          response.on('data', (chunk) => chunks.push(chunk));
          response.on('end', () => {
            try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch (error) { reject(error); }
          });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
      });
    } else if (params.name === 'log_search_result') {
      if (!params.arguments?.id) throw new Error('The id argument is required.');
      data = await request(`/commands/${encodeURIComponent(params.arguments.id)}`);
    } else if (params.name === 'network_capture_clear') data = await request('/captures', 'DELETE');
    else throw new Error(`Unknown tool: ${params.name}`);

    return jsonRpcResult(id, { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] });
  } catch (error) {
    return jsonRpcResult(id, { content: [{ type: 'text', text: error.message }], isError: true });
  }
}

const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
input.on('line', async (line) => {
  if (!line.trim()) return;
  try {
    const response = await handle(JSON.parse(line));
    if (response) process.stdout.write(`${JSON.stringify(response)}\n`);
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: error.message } })}\n`);
  }
});

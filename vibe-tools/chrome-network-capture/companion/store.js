import { appendFile, mkdir, readdir, readFile, rm } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';

const DEFAULT_MAX_EVENTS = 1000;
const DEFAULT_MAX_BODY_BYTES = 2 * 1024 * 1024;
const SESSION_ID_PATTERN = /^[a-zA-Z0-9-]{1,128}$/;

function byteLength(value) {
  return Buffer.byteLength(value || '', 'utf8');
}

function truncate(value, limit) {
  if (typeof value !== 'string' || byteLength(value) <= limit) return value;
  return `${value.slice(0, limit)}\n[truncated locally at ${limit} bytes]`;
}

function dateFor(event) {
  const timestamp = event.at || event.completedAt || event.startedAt;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) throw new Error('Capture event must include a valid timestamp.');
  return date.toISOString().slice(0, 10);
}

function assertWithinDirectory(directory, filePath) {
  if (relative(directory, filePath).startsWith('..')) throw new Error('Capture path is outside the storage directory.');
}

export class CaptureStore {
  constructor({ maxEvents = DEFAULT_MAX_EVENTS, maxBodyBytes = DEFAULT_MAX_BODY_BYTES, storageDirectory } = {}) {
    this.maxEvents = maxEvents;
    this.maxBodyBytes = maxBodyBytes;
    this.storageDirectory = storageDirectory ? resolve(storageDirectory) : null;
    this.events = [];
    this.sessions = new Map();
  }

  prepare(event) {
    const stored = structuredClone(event);
    if (typeof stored.requestBody === 'string') stored.requestBody = truncate(stored.requestBody, this.maxBodyBytes);
    if (typeof stored.responseBody === 'string') stored.responseBody = truncate(stored.responseBody, this.maxBodyBytes);
    return stored;
  }

  sessionFileFor(event) {
    if (!this.storageDirectory) return null;
    if (typeof event.sessionId !== 'string' || !SESSION_ID_PATTERN.test(event.sessionId)) {
      throw new Error('Capture event must include a filename-safe sessionId.');
    }
    const filePath = join(this.storageDirectory, dateFor(event), `${event.sessionId}.jsonl`);
    assertWithinDirectory(this.storageDirectory, filePath);
    return filePath;
  }

  addToMemory(stored) {
    if (stored.type === 'capture-started') {
      this.sessions.set(stored.sessionId, {
        sessionId: stored.sessionId,
        tabId: stored.tabId,
        startedAt: stored.at,
        url: stored.url,
        active: true,
      });
    } else if (stored.type === 'capture-detached') {
      const session = this.sessions.get(stored.sessionId);
      if (session) session.active = false;
    }

    this.events.push(stored);
    while (this.events.length > this.maxEvents) this.events.shift();
  }

  async jsonlFiles(directory = this.storageDirectory) {
    try {
      const entries = await readdir(directory, { withFileTypes: true });
      const files = [];
      for (const entry of entries) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) files.push(...await this.jsonlFiles(path));
        else if (entry.isFile() && entry.name.endsWith('.jsonl')) files.push(path);
      }
      return files.sort();
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  async load() {
    if (!this.storageDirectory) return { loaded: 0, filesLoaded: 0 };

    try {
      const files = await this.jsonlFiles();
      let loaded = 0;
      for (const filePath of files) {
        const contents = await readFile(filePath, 'utf8');
        for (const [index, line] of contents.split('\n').entries()) {
          if (!line.trim()) continue;
          try {
            this.addToMemory(JSON.parse(line));
            loaded += 1;
          } catch (error) {
            throw new Error(`Invalid JSONL record in ${filePath} at line ${index + 1}: ${error.message}`);
          }
        }
      }
      return { loaded, filesLoaded: files.length };
    } catch (error) {
      throw new Error(`Could not load captures from ${this.storageDirectory}: ${error.message}`);
    }
  }

  async add(event) {
    const stored = this.prepare(event);
    const storageFile = this.sessionFileFor(stored);
    if (storageFile) {
      try {
        await mkdir(dirname(storageFile), { recursive: true });
        await appendFile(storageFile, `${JSON.stringify(stored)}\n`, 'utf8');
      } catch (error) {
        throw new Error(`Could not save capture to ${storageFile}: ${error.message}`);
      }
    }
    this.addToMemory(stored);
    return stored;
  }

  status() {
    return {
      eventCount: this.events.length,
      maxEvents: this.maxEvents,
      maxBodyBytes: this.maxBodyBytes,
      storageDirectory: this.storageDirectory,
      sessions: [...this.sessions.values()],
    };
  }

  list({ limit = 50, offset = 0, urlIncludes, method, status, mimeType } = {}) {
    const normalizedLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const normalizedOffset = Math.max(Number(offset) || 0, 0);
    let items = this.events.filter((event) => event.id);

    if (urlIncludes) items = items.filter((event) => event.url.includes(urlIncludes));
    if (method) items = items.filter((event) => event.method === method);
    if (status !== undefined) items = items.filter((event) => event.status === Number(status));
    if (mimeType) items = items.filter((event) => (event.mimeType || '').includes(mimeType));

    items = items.slice().reverse();
    const total = items.length;
    const page = items.slice(normalizedOffset, normalizedOffset + normalizedLimit).map((event) => ({
      id: event.id,
      sessionId: event.sessionId,
      tabId: event.tabId,
      startedAt: event.startedAt,
      completedAt: event.completedAt,
      method: event.method,
      url: event.url,
      status: event.status,
      statusText: event.statusText,
      mimeType: event.mimeType,
      type: event.type,
      encodedDataLength: event.encodedDataLength,
      failure: event.failure,
      requestBodyBytes: byteLength(event.requestBody),
      responseBodyBytes: byteLength(event.responseBody),
    }));

    return { total, offset: normalizedOffset, limit: normalizedLimit, items: page };
  }

  latestLogSearchCapture() {
    return [...this.events].reverse().find((event) => (
      event.method === 'POST' &&
      event.url === 'https://console.nexita.net/api/log/log/advanced/search' &&
      event.requestHeaders?.Cookie
    )) || null;
  }

  get(id, include = []) {
    const event = this.events.find((item) => item.id === id);
    if (!event) return null;

    const result = {
      id: event.id,
      sessionId: event.sessionId,
      tabId: event.tabId,
      startedAt: event.startedAt,
      completedAt: event.completedAt,
      method: event.method,
      url: event.url,
      status: event.status,
      statusText: event.statusText,
      mimeType: event.mimeType,
      type: event.type,
      failure: event.failure,
    };

    for (const field of include) {
      if (['requestHeaders', 'requestBody', 'responseHeaders', 'responseBody', 'responseBodyBase64Encoded', 'protocol', 'remoteIPAddress', 'encodedDataLength'].includes(field)) {
        result[field] = event[field] ?? null;
      }
    }
    return result;
  }

  async clear() {
    const cleared = this.events.length;
    let filesCleared = 0;
    if (this.storageDirectory) {
      try {
        const files = await this.jsonlFiles();
        await rm(this.storageDirectory, { recursive: true, force: true });
        filesCleared = files.length;
      } catch (error) {
        throw new Error(`Could not clear captures from ${this.storageDirectory}: ${error.message}`);
      }
    }
    this.events = [];
    this.sessions.clear();
    return { cleared, filesCleared };
  }
}

export function normalizeLogSearchInput(input = {}) {
  const requiredStrings = ['appCode', 'env'];
  for (const field of requiredStrings) {
    if (typeof input[field] !== 'string' || !input[field]) throw new Error(`${field} is required.`);
  }
  if (!Number.isFinite(input.from) || !Number.isFinite(input.to) || input.from >= input.to) {
    throw new Error('from and to must be Unix millisecond timestamps with from < to.');
  }

  const appCodes = Array.isArray(input.appCodes) && input.appCodes.length ? input.appCodes : [input.appCode];
  return {
    appCode: input.appCode,
    name: input.name || input.appCode,
    appCodes,
    logLevel: input.logLevel || '',
    q: input.q || '',
    env: input.env,
    namespace: input.namespace || '',
    from: input.from,
    to: input.to,
    sortOrder: input.sortOrder === 'ASC' ? 'ASC' : 'DESC',
    isAgg: input.isAgg !== false,
    scrollId: input.scrollId || null,
    logCategory: input.logCategory || 'applog',
    logTag: input.logTag || '',
    timeSectionKey: input.timeSectionKey || '',
    timeSections: Array.isArray(input.timeSections) ? input.timeSections : [],
    timeSectionMap: input.timeSectionMap && typeof input.timeSectionMap === 'object' ? input.timeSectionMap : {},
  };
}

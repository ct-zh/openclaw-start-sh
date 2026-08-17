const LOCAL_ENDPOINT = 'http://127.0.0.1:37777/events';
const MAX_PENDING_EVENTS = 200;
const capturedTabs = new Map();
const pendingEvents = [];
let flushInProgress = false;
const commandPollAlarm = 'poll-local-commands';

chrome.alarms.create(commandPollAlarm, { periodInMinutes: 0.1 });

function isCapturableUrl(url) {
  return typeof url === 'string' && /^https?:\/\//.test(url);
}

function makeKey(tabId, requestId) {
  return `${tabId}:${requestId}`;
}

function headerMap(headers = []) {
  if (Array.isArray(headers)) return Object.fromEntries(headers.map(({ name, value }) => [name, value]));
  return { ...headers };
}

async function localRequest(path, options = {}) {
  const response = await fetch(`http://127.0.0.1:37777${path}`, options);
  if (!response.ok) throw new Error(`Local service returned ${response.status}`);
  return response.json();
}

function queueEvent(event) {
  pendingEvents.push(event);
  if (pendingEvents.length > MAX_PENDING_EVENTS) pendingEvents.shift();
  flushEvents();
}

async function flushEvents() {
  if (flushInProgress || pendingEvents.length === 0) return;
  flushInProgress = true;

  try {
    while (pendingEvents.length > 0) {
      const event = pendingEvents[0];
      const response = await fetch(LOCAL_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(event),
      });
      if (!response.ok) throw new Error(`Local service returned ${response.status}`);
      pendingEvents.shift();
    }
  } catch (error) {
    console.warn('Local Network Capture: cannot deliver event', error.message);
  } finally {
    flushInProgress = false;
  }
}

function recordRequest(tabId, requestId, request) {
  const state = capturedTabs.get(tabId);
  if (!state) return;

  state.requests.set(requestId, {
    id: crypto.randomUUID(),
    sessionId: state.sessionId,
    tabId,
    requestId,
    startedAt: new Date().toISOString(),
    url: request.url,
    method: request.method,
    requestHeaders: headerMap(request.headers),
    requestBody: request.postData || null,
    type: request.type || null,
  });
}

async function captureResponseBody(tabId, requestId) {
  const state = capturedTabs.get(tabId);
  const record = state?.requests.get(requestId);
  if (!record) return;

  try {
    const body = await chrome.debugger.sendCommand({ tabId }, 'Network.getResponseBody', { requestId });
    record.responseBody = body.body;
    record.responseBodyBase64Encoded = body.base64Encoded;
  } catch (error) {
    record.responseBodyError = error.message;
  }
}

async function completeRequest(tabId, requestId, failure) {
  const state = capturedTabs.get(tabId);
  const record = state?.requests.get(requestId);
  if (!record) return;

  if (!failure) await captureResponseBody(tabId, requestId);
  record.completedAt = new Date().toISOString();
  if (failure) record.failure = failure;
  state.requests.delete(requestId);
  queueEvent(record);
}

chrome.debugger.onEvent.addListener((source, method, params) => {
  const tabId = source.tabId;
  if (!capturedTabs.has(tabId)) return;

  if (method === 'Network.requestWillBeSent') {
    if (isCapturableUrl(params.request.url)) recordRequest(tabId, params.requestId, params.request);
    return;
  }

  const record = capturedTabs.get(tabId).requests.get(params.requestId);
  if (!record) return;

  if (method === 'Network.requestWillBeSentExtraInfo') {
    record.requestHeaders = headerMap(params.headers);
    record.associatedCookies = params.associatedCookies;
  } else if (method === 'Network.responseReceived') {
    record.status = params.response.status;
    record.statusText = params.response.statusText;
    record.mimeType = params.response.mimeType;
    record.protocol = params.response.protocol;
    record.remoteIPAddress = params.response.remoteIPAddress;
    record.responseHeaders = headerMap(params.response.headers);
  } else if (method === 'Network.responseReceivedExtraInfo') {
    record.status = params.statusCode || record.status;
    record.responseHeaders = headerMap(params.headers);
  } else if (method === 'Network.loadingFinished') {
    record.encodedDataLength = params.encodedDataLength;
    completeRequest(tabId, params.requestId);
  } else if (method === 'Network.loadingFailed') {
    completeRequest(tabId, params.requestId, {
      errorText: params.errorText,
      canceled: params.canceled === true,
    });
  }
});

chrome.debugger.onDetach.addListener((source, reason) => {
  const state = capturedTabs.get(source.tabId);
  if (!state) return;
  capturedTabs.delete(source.tabId);
  queueEvent({ type: 'capture-detached', sessionId: state.sessionId, tabId: source.tabId, reason, at: new Date().toISOString() });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  capturedTabs.delete(tabId);
});

async function startCapture(tabId) {
  const tab = await chrome.tabs.get(tabId);
  if (!isCapturableUrl(tab.url)) throw new Error('Only HTTP(S) tabs can be captured.');
  if (capturedTabs.has(tabId)) return { active: true };

  await chrome.debugger.attach({ tabId }, '1.3');
  await chrome.debugger.sendCommand({ tabId }, 'Network.enable', { maxPostDataSize: 10 * 1024 * 1024 });
  const sessionId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  capturedTabs.set(tabId, { sessionId, requests: new Map(), startedAt });
  queueEvent({ type: 'capture-started', sessionId, tabId, url: tab.url, at: startedAt });
  return { active: true };
}

async function stopCapture(tabId) {
  const state = capturedTabs.get(tabId);
  if (!state) return { active: false };
  await chrome.debugger.detach({ tabId });
  if (capturedTabs.get(tabId) === state) {
    capturedTabs.delete(tabId);
    queueEvent({ type: 'capture-detached', sessionId: state.sessionId, tabId, reason: 'stopped', at: new Date().toISOString() });
  }
  return { active: false };
}

async function runLogSearch(tabId, body) {
  if (!capturedTabs.has(tabId)) throw new Error('Start capture for this tab before running a log search.');
  const result = await chrome.debugger.sendCommand({ tabId }, 'Runtime.evaluate', {
    expression: `fetch('/api/log/log/advanced/search', {method: 'POST', credentials: 'include', headers: {'content-type': 'application/json'}, body: ${JSON.stringify(JSON.stringify(body))}}).then(async response => ({status: response.status, body: await response.text()}))`,
    awaitPromise: true,
    returnByValue: true,
  });
  const value = result.result?.value;
  if (!value) throw new Error('The page did not return a log-search response.');
  let responseBody;
  try { responseBody = JSON.parse(value.body); } catch { responseBody = value.body; }
  return { status: value.status, response: responseBody };
}

async function pollLocalCommands() {
  if (capturedTabs.size !== 1) return;
  try {
    const { command } = await localRequest('/commands/next');
    if (!command) return;
    const tabId = [...capturedTabs.keys()][0];
    try {
      const result = await runLogSearch(tabId, command.body);
      await localRequest(`/commands/${encodeURIComponent(command.id)}/result`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true, ...result }),
      });
    } catch (error) {
      await localRequest(`/commands/${encodeURIComponent(command.id)}/result`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: false, error: error.message }),
      });
    }
  } catch (error) {
    console.warn('Local Network Capture: cannot poll commands', error.message);
  }
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === commandPollAlarm) pollLocalCommands();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'status') {
    sendResponse({ active: capturedTabs.has(message.tabId) });
    return;
  }

  if (message.type === 'toggle') {
    const operation = capturedTabs.has(message.tabId) ? stopCapture(message.tabId) : startCapture(message.tabId);
    operation.then(sendResponse).catch((error) => sendResponse({ active: capturedTabs.has(message.tabId), error: error.message }));
    return true;
  }

  if (message.type === 'run-log-search') {
    runLogSearch(message.tabId, message.body)
      .then(sendResponse)
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }
});

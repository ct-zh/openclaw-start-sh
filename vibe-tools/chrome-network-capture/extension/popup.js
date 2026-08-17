const tabElement = document.querySelector('#tab');
const statusElement = document.querySelector('#status');
const toggleButton = document.querySelector('#toggle');
let tabId;

function renderStatus(response) {
  const active = response?.active === true;
  const error = response?.error;
  statusElement.textContent = error || (active ? '正在采集当前标签页的网络请求' : '未开始采集');
  statusElement.className = error ? 'error' : (active ? 'active' : 'idle');
  toggleButton.textContent = active ? '停止采集' : '开始采集';
  toggleButton.classList.toggle('stop', active);
  toggleButton.disabled = !tabId;
}

async function refresh() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  tabId = tab?.id;
  if (!tabId || !tab?.url?.startsWith('http')) {
    tabElement.textContent = '请先打开一个网页标签页。';
    tabId = undefined;
    renderStatus({ error: '当前标签页无法采集网络请求。' });
    return;
  }

  tabElement.textContent = tab.title || tab.url;
  renderStatus(await chrome.runtime.sendMessage({ type: 'status', tabId }));
}

toggleButton.addEventListener('click', async () => {
  const result = await chrome.runtime.sendMessage({ type: 'toggle', tabId });
  renderStatus(result);
});

refresh().catch((error) => renderStatus({ error: error.message }));

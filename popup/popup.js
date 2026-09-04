/**
 * ============================================================
 * ChatGPT Script Saver - popup.js
 * Auto-Pilot Launcher & History Manager
 * ============================================================
 */

let currentTabId = null;
let autoPilotState = {
  status: 'IDLE',
  currentPart: 0,
  totalParts: 12
};

const elements = {
  tabButtons: document.querySelectorAll('.tab-btn'),
  tabPanes: document.querySelectorAll('.tab-pane'),
  notChatGptAlert: document.getElementById('not-chatgpt-alert'),

  // Inputs
  inputContent: document.getElementById('popup-input-content'),
  checkboxOutline: document.getElementById('popup-checkbox-outline'),
  inputParts: document.getElementById('popup-input-parts'),
  inputPattern: document.getElementById('popup-input-pattern'),
  btnSample: document.getElementById('btn-popup-sample'),

  // Controls
  btnStart: document.getElementById('btn-popup-start'),
  btnPause: document.getElementById('btn-popup-pause'),
  btnStop: document.getElementById('btn-popup-stop'),

  // Progress
  progressBox: document.getElementById('popup-progress-box'),
  progressText: document.getElementById('popup-progress-text'),
  progressPercent: document.getElementById('popup-progress-percent'),
  progressBar: document.getElementById('popup-progress-bar'),
  statusMsg: document.getElementById('popup-status-msg'),

  // History
  historySearchInput: document.getElementById('history-search-input'),
  historyTotalCount: document.getElementById('history-total-count'),
  btnRefreshHistory: document.getElementById('btn-refresh-history'),
  historyList: document.getElementById('history-list'),
  historyEmpty: document.getElementById('history-empty'),

  // Settings
  btnOpenSettings: document.getElementById('btn-open-settings'),
  toast: document.getElementById('toast-message')
};

function initTabs() {
  elements.tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.tabButtons.forEach(b => b.classList.toggle('active', b === btn));
      elements.tabPanes.forEach(p => p.classList.toggle('active', p.id === `tab-${btn.dataset.tab}`));
      if (btn.dataset.tab === 'history') loadHistory();
    });
  });
}

async function initTabInfo() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url || (!tab.url.includes('chatgpt.com') && !tab.url.includes('chat.openai.com'))) {
      if (elements.notChatGptAlert) elements.notChatGptAlert.classList.remove('hidden');
      if (elements.btnStart) elements.btnStart.disabled = true;
      return;
    }

    currentTabId = tab.id;
    if (elements.notChatGptAlert) elements.notChatGptAlert.classList.add('hidden');

    // Lấy trạng thái Auto-Pilot hiện tại từ Content Script
    chrome.tabs.sendMessage(tab.id, { type: 'GET_AUTOPILOT_STATUS' }, (resp) => {
      if (resp && resp.success && resp.state) {
        applyState(resp.state);
      }
    });
  } catch (e) {
    console.warn('[Popup] Error init tab:', e);
  }
}

function applyState(state) {
  autoPilotState = state;
  if (state.status === 'RUNNING' || state.status === 'PAUSED') {
    elements.progressBox.style.display = 'block';
    elements.btnStart.style.display = 'none';
    elements.btnPause.style.display = 'inline-flex';
    elements.btnStop.style.display = 'inline-flex';

    if (state.currentPart === 0) {
      elements.progressText.textContent = `Dàn ý (Outline)`;
      elements.progressPercent.textContent = `0%`;
      elements.progressBar.style.width = `5%`;
      elements.statusMsg.textContent = state.status === 'PAUSED' ? 'Đang tạm dừng' : 'Đang lập dàn ý (không lưu vào file)...';
    } else {
      elements.progressText.textContent = `Part ${state.currentPart}/${state.totalParts}`;
      elements.progressPercent.textContent = `${state.progressPercent || 0}%`;
      elements.progressBar.style.width = `${state.progressPercent || 0}%`;
      elements.statusMsg.textContent = state.status === 'PAUSED' ? 'Đang tạm dừng' : 'Đang chạy tự động...';
    }
  } else if (state.status === 'COMPLETED') {
    elements.progressBox.style.display = 'block';
    elements.btnStart.style.display = 'block';
    elements.btnStart.textContent = '✓ ĐÃ XONG! BẮT ĐẦU BÀI MỚI';
    elements.btnPause.style.display = 'none';
    elements.btnStop.style.display = 'none';
    elements.progressBar.style.width = '100%';
    elements.progressPercent.textContent = '100%';
    elements.statusMsg.textContent = 'Đã hoàn tất kịch bản và tải file .txt!';
  } else {
    elements.progressBox.style.display = 'none';
    elements.btnStart.style.display = 'block';
    elements.btnStart.textContent = '🚀 BẮT ĐẦU CHẠY AUTO';
    elements.btnPause.style.display = 'none';
    elements.btnStop.style.display = 'none';
  }
}

function handleStart() {
  const content = elements.inputContent.value.trim();
  const totalParts = elements.inputParts.value.trim();
  const nextPromptPattern = elements.inputPattern.value.trim();
  const hasOutline = elements.checkboxOutline ? elements.checkboxOutline.checked : false;

  if (!content) {
    showToast('Vui lòng dán nội dung kịch bản!', 'error');
    return;
  }

  if (!currentTabId) {
    showToast('Chưa kết nối được với tab ChatGPT!', 'error');
    return;
  }

  chrome.tabs.sendMessage(currentTabId, {
    type: 'START_AUTOPILOT',
    config: { content, totalParts, nextPromptPattern, hasOutline }
  }, (resp) => {
    if (resp && resp.success) {
      applyState(resp.state);
      showToast('Đã bắt đầu Auto-Pilot!', 'success');
    }
  });
}

function handlePause() {
  if (!currentTabId) return;
  const isPaused = autoPilotState.status === 'PAUSED';
  const type = isPaused ? 'RESUME_AUTOPILOT' : 'PAUSE_AUTOPILOT';

  chrome.tabs.sendMessage(currentTabId, { type }, (resp) => {
    if (resp && resp.success) {
      applyState(resp.state);
      elements.btnPause.textContent = isPaused ? '⏸ Tạm dừng' : '▶ Tiếp tục';
    }
  });
}

function handleStop() {
  if (!currentTabId) return;
  if (confirm('Hủy tiến trình Auto-Pilot này?')) {
    chrome.tabs.sendMessage(currentTabId, { type: 'STOP_AUTOPILOT' }, (resp) => {
      if (resp && resp.success) {
        applyState(resp.state);
        showToast('Đã hủy Auto-Pilot', 'info');
      }
    });
  }
}

function loadHistory() {
  if (!elements.historyList) return;
  elements.historyList.innerHTML = '<div style="text-align:center;padding:12px;color:#888;">Đang tải...</div>';

  chrome.runtime.sendMessage({ type: 'GET_ALL_CONVERSATIONS' }, (resp) => {
    if (!resp || !resp.success || !resp.conversations) {
      elements.historyList.innerHTML = '<div style="text-align:center;padding:12px;color:#e03e3e;">Lỗi tải lịch sử</div>';
      return;
    }
    renderHistoryList(resp.conversations);
  });
}

function renderHistoryList(list) {
  const container = elements.historyList;
  container.innerHTML = '';

  const search = (elements.historySearchInput ? elements.historySearchInput.value.trim().toLowerCase() : '');
  const filtered = list.filter(item => !search || (item.title || '').toLowerCase().includes(search));

  if (elements.historyTotalCount) {
    elements.historyTotalCount.textContent = `${filtered.length} kịch bản đã xuất`;
  }

  if (!filtered.length) {
    if (elements.historyEmpty) elements.historyEmpty.classList.remove('hidden');
    return;
  }

  if (elements.historyEmpty) elements.historyEmpty.classList.add('hidden');

  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = 'history-item';
    const id = item.conversationId || item.id;
    const dateStr = item.updatedAt ? new Date(item.updatedAt).toLocaleString('vi-VN') : 'Mới';

    card.innerHTML = `
      <div class="history-item-top">
        <h4 class="history-title" title="${escapeHtml(item.title)}">🎬 ${escapeHtml(item.title)}</h4>
      </div>
      <div class="history-meta-row">
        <span>${dateStr}</span>
        <span class="history-count-badge">${item.responseCount || 12} phần</span>
      </div>
      <div class="history-actions">
        <button type="button" class="btn btn-primary btn-sm btn-hist-export">Xuất lại .txt</button>
        <button type="button" class="btn btn-danger btn-sm btn-hist-del">Xóa</button>
      </div>
    `;

    card.querySelector('.btn-hist-export').addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'EXPORT_TXT', conversationId: id });
    });

    card.querySelector('.btn-hist-del').addEventListener('click', () => {
      if (confirm(`Xóa kịch bản "${item.title}"?`)) {
        chrome.runtime.sendMessage({ type: 'DELETE_CONVERSATION', conversationId: id }, () => {
          loadHistory();
        });
      }
    });

    container.appendChild(card);
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

let toastTimer = null;
function showToast(msg, type = 'info') {
  if (!elements.toast) return;
  clearTimeout(toastTimer);
  elements.toast.textContent = msg;
  elements.toast.className = 'toast';
  if (type === 'error') elements.toast.classList.add('toast-error');
  if (type === 'success') elements.toast.classList.add('toast-success');
  elements.toast.classList.remove('hidden');
  toastTimer = setTimeout(() => { elements.toast.classList.add('hidden'); }, 2200);
}

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initTabInfo();

  if (elements.btnStart) elements.btnStart.addEventListener('click', handleStart);
  if (elements.btnPause) elements.btnPause.addEventListener('click', handlePause);
  if (elements.btnStop) elements.btnStop.addEventListener('click', handleStop);

  if (elements.checkboxOutline) {
    chrome.storage.local.get(['ssp_has_outline'], (res) => {
      if (res && typeof res.ssp_has_outline !== 'undefined') {
        elements.checkboxOutline.checked = !!res.ssp_has_outline;
      } else {
        elements.checkboxOutline.checked = localStorage.getItem('ssp_has_outline') === 'true';
      }
    });

    elements.checkboxOutline.addEventListener('change', () => {
      const isChecked = elements.checkboxOutline.checked;
      try { chrome.storage.local.set({ ssp_has_outline: isChecked }); } catch {}
      try { localStorage.setItem('ssp_has_outline', isChecked ? 'true' : 'false'); } catch {}
    });
  }

  if (elements.btnSample) {
    elements.btnSample.addEventListener('click', () => {
      elements.inputContent.value = 
`The Korean Mafia Boss Asked Why the Black Maid Locked His Empty Bedroom—Minutes Later, Someone Begged...

SHORT STORY SUMMARY:
The Black maid checks the Mafia Boss’s bedroom, finds it apparently empty, and locks the door from the outside. His guards mock her until several minutes later someone inside begins pounding on the door and demanding to be released. She had noticed the curtains moving even though every window was closed, but she deliberately said nothing so the intruder would believe he remained undiscovered. When they open the room, the person trapped inside is not an assassin—it is someone the boss trusted enough to possess a private key.`;
      elements.inputParts.value = '12';
      elements.inputPattern.value = 'OKE {n}';
    });
  }

  if (elements.btnRefreshHistory) elements.btnRefreshHistory.addEventListener('click', loadHistory);
  if (elements.historySearchInput) elements.historySearchInput.addEventListener('input', loadHistory);

  if (elements.btnOpenSettings) {
    elements.btnOpenSettings.addEventListener('click', () => {
      chrome.runtime.openOptionsPage 
        ? chrome.runtime.openOptionsPage()
        : chrome.tabs.create({ url: chrome.runtime.getURL('settings/settings.html') });
    });
  }
});

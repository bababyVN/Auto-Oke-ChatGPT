/**
 * ============================================================
 * ChatGPT Script Saver - settings.js
 * Quản lý trang cài đặt bộ lọc, presets kịch bản & Live Tester
 * ============================================================
 */

let currentSettings = {
  keywords: [],
  filterMode: 'remove-line',
  exportMode: 'voiceover',
  autoSave: true,
  showNotification: true,
  removeBlankLines: true
};

const elements = {
  keywordCountBadge: document.getElementById('keyword-count-badge'),
  inputNewKeyword: document.getElementById('input-new-keyword'),
  checkIsRegex: document.getElementById('check-is-regex'),
  btnAddKeyword: document.getElementById('btn-add-keyword'),
  btnLoadPreset: document.getElementById('btn-load-preset'),
  keywordsList: document.getElementById('keywords-list'),
  modeRadios: document.querySelectorAll('input[name="filterMode"]'),
  exportRadios: document.querySelectorAll('input[name="exportMode"]'),
  optAutoSave: document.getElementById('opt-auto-save'),
  optShowNotification: document.getElementById('opt-show-notification'),
  optRemoveBlankLines: document.getElementById('opt-remove-blank-lines'),
  testInput: document.getElementById('test-input'),
  testOutput: document.getElementById('test-output'),
  testStats: document.getElementById('test-stats'),
  btnSampleData: document.getElementById('btn-sample-data'),
  btnTestFilter: document.getElementById('btn-test-filter'),
  btnReset: document.getElementById('btn-reset'),
  btnSave: document.getElementById('btn-save'),
  toast: document.getElementById('toast')
};

// ============================================================
// 1. TẢI VÀ RENDER CÀI ĐẶT
// ============================================================
async function initSettings() {
  if (window.StorageHelper) {
    currentSettings = await window.StorageHelper.getSettings();
  } else {
    currentSettings = getDefaultPresetSettings();
  }

  renderSettingsForm();
}

function renderSettingsForm() {
  // 1. Render danh sách từ khóa
  renderKeywordsList();

  // 2. Radio filterMode
  elements.modeRadios.forEach(radio => {
    radio.checked = (radio.value === currentSettings.filterMode);
  });

  // 3. Radio exportMode
  if (elements.exportRadios) {
    elements.exportRadios.forEach(radio => {
      radio.checked = (radio.value === (currentSettings.exportMode || 'voiceover'));
    });
  }

  // 4. Checkboxes
  elements.optAutoSave.checked = currentSettings.autoSave !== false;
  elements.optShowNotification.checked = currentSettings.showNotification !== false;
  elements.optRemoveBlankLines.checked = currentSettings.removeBlankLines !== false;
}

function renderKeywordsList() {
  const container = elements.keywordsList;
  container.innerHTML = '';

  const keywords = currentSettings.keywords || [];
  elements.keywordCountBadge.textContent = `${keywords.length} từ khóa`;

  if (!keywords.length) {
    container.innerHTML = '<div style="text-align:center;padding:15px;color:#888;">Chưa có từ khóa lọc nào. Hãy thêm từ khóa hoặc nạp Preset!</div>';
    return;
  }

  keywords.forEach((kw, index) => {
    const item = document.createElement('div');
    item.className = 'keyword-item';

    item.innerHTML = `
      <div class="keyword-info">
        <span class="keyword-value">${escapeHtml(kw.value)}</span>
        ${kw.isRegex ? '<span class="badge-regex">REGEX</span>' : ''}
      </div>
      <button type="button" class="btn-del-kw" title="Xóa từ khóa này">&times;</button>
    `;

    item.querySelector('.btn-del-kw').addEventListener('click', () => {
      removeKeyword(index);
    });

    container.appendChild(item);
  });
}

function addKeyword() {
  const value = elements.inputNewKeyword.value.trim();
  if (!value) return;

  const isRegex = elements.checkIsRegex.checked;

  if (isRegex) {
    try {
      new RegExp(value, 'gi');
    } catch {
      showToast('Biểu thức Regex không hợp lệ!', 'error');
      return;
    }
  }

  currentSettings.keywords.unshift({ value, isRegex });
  elements.inputNewKeyword.value = '';
  elements.checkIsRegex.checked = false;

  renderKeywordsList();
  showToast(`Đã thêm từ khóa: "${value}"`, 'success');
}

function removeKeyword(index) {
  currentSettings.keywords.splice(index, 1);
  renderKeywordsList();
}

function loadPresetKeywords() {
  currentSettings = getDefaultPresetSettings();
  renderSettingsForm();
  showToast('⚡ Đã nạp đầy đủ danh sách từ khóa kịch bản chuẩn!', 'success');
}

function getDefaultPresetSettings() {
  return {
    keywords: [
      // Đánh dấu điều khiển người dùng
      { value: 'OKE\\s*x\\s*\\d+', isRegex: true },
      // Đánh dấu phân đoạn
      { value: 'Part\\s*\\d+\\s*[\\/\\-]\\s*\\d+', isRegex: true },
      { value: '^(Part|Hồi|Phần|Cảnh)\\s*\\d+.*', isRegex: true },
      { value: 'Part1', isRegex: false },
      { value: 'Part2', isRegex: false },
      { value: 'Part3', isRegex: false },
      { value: 'Part4', isRegex: false },
      { value: 'Part5', isRegex: false },
      { value: 'Part 1', isRegex: false },
      { value: 'Part 2', isRegex: false },
      { value: 'Part 3', isRegex: false },
      // Trạng thái AI
      { value: 'đã hoàn thành', isRegex: false },
      { value: 'Đã hoàn thành', isRegex: false },
      { value: 'hoàn thành', isRegex: false },
      { value: 'Tiếp tục', isRegex: false },
      { value: 'Tôi sẽ tiếp tục', isRegex: false },
      { value: 'Tiếp theo', isRegex: false },
      { value: 'Dưới đây là', isRegex: false },
      { value: '(tiếp)', isRegex: false },
      { value: '(hết)', isRegex: false },
      // Lời chào mở đầu và kết thúc AI
      { value: '^(Dưới đây là|Chắc chắn rồi|Tôi xin gửi).*?:', isRegex: true },
      { value: '(Bạn có muốn tôi tiếp tục|Hãy cho tôi biết).*?(\\?|$)', isRegex: true },
      // Kẻ ngang markdown
      { value: '---+', isRegex: true }
    ],
    filterMode: 'remove-line',
    exportMode: 'voiceover',
    autoSave: true,
    showNotification: true,
    removeBlankLines: true
  };
}

// ============================================================
// 2. THỬ NGHIỆM BỘ LỌC (LIVE TESTER)
// ============================================================
function runFilterTest() {
  const input = elements.testInput.value;
  if (!input.trim()) {
    elements.testOutput.value = '';
    elements.testStats.textContent = '0 từ | 0 dòng';
    return;
  }

  // Thu thập filterMode hiện hành
  let mode = 'remove-line';
  elements.modeRadios.forEach(r => { if (r.checked) mode = r.value; });

  let result = '';
  if (window.TextFilter) {
    result = window.TextFilter.filterText(
      input,
      currentSettings.keywords,
      window.TextFilter.getDefaultRegexPatterns(),
      mode
    );
  } else {
    result = input;
  }

  elements.testOutput.value = result;

  const words = window.TextFilter ? window.TextFilter.countWords(result) : result.split(/\s+/).length;
  const lines = result ? result.split('\n').filter(Boolean).length : 0;
  elements.testStats.textContent = `${words} từ | ${lines} đoạn`;
}

function pasteUserSampleData() {
  const sample = `Đầu tiên là MP

The Korean Mafia Boss Asked Why the Black Maid Locked His Empty Bedroom—Minutes Later, Someone Begged...

SHORT STORY SUMMARY:
The Black maid checks the Mafia Boss’s bedroom, finds it apparently empty, and locks the door from the outside. His guards mock her until several minutes later someone inside begins pounding on the door and demanding to be released. She had noticed the curtains moving even though every window was closed, but she deliberately said nothing so the intruder would believe he remained undiscovered. When they open the room, the person trapped inside is not an assassin—it is someone the boss trusted enough to possess a private key.

Part 1: The Discovery
She adjusted her apron, pretending to be busy dusting the picture frames. The hallway remained dead silent.
Một vài phút sau, tiếng đập cửa dồn dập vang lên từ bên trong.

Tôi đã hoàn thành phần 1. Bạn có muốn tôi tiếp tục viết phần tiếp theo không?

OKE x12`;

  elements.testInput.value = sample;
  runFilterTest();
  showToast('✓ Đã dán kịch bản mẫu và lọc tức thì!', 'success');
}

// ============================================================
// 3. LƯU CÀI ĐẶT
// ============================================================
async function saveAllSettings() {
  // Thu thập filterMode
  elements.modeRadios.forEach(r => { if (r.checked) currentSettings.filterMode = r.value; });

  // Thu thập exportMode
  if (elements.exportRadios) {
    elements.exportRadios.forEach(r => { if (r.checked) currentSettings.exportMode = r.value; });
  }

  // Thu thập options
  currentSettings.autoSave = elements.optAutoSave.checked;
  currentSettings.showNotification = elements.optShowNotification.checked;
  currentSettings.removeBlankLines = elements.optRemoveBlankLines.checked;

  if (window.StorageHelper) {
    await window.StorageHelper.saveSettings(currentSettings);
  } else {
    await chrome.storage.sync.set({ settings: currentSettings });
  }

  showToast('✓ Đã lưu toàn bộ cài đặt thành công!', 'success');
}

// ============================================================
// 4. TIỆN ÍCH
// ============================================================
let toastTimer = null;
function showToast(msg, type = 'info') {
  const toast = elements.toast;
  if (!toast) return;
  clearTimeout(toastTimer);

  toast.querySelector('.toast-message').textContent = msg;
  toast.className = 'toast show';
  if (type === 'error') toast.classList.add('toast-error');

  toastTimer = setTimeout(() => {
    toast.className = 'toast';
  }, 2400);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ============================================================
// 5. SỰ KIỆN KHỞI TẠO (DOM READY)
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  initSettings();

  elements.btnAddKeyword.addEventListener('click', addKeyword);
  elements.inputNewKeyword.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addKeyword();
  });

  elements.btnLoadPreset.addEventListener('click', loadPresetKeywords);
  elements.btnSampleData.addEventListener('click', pasteUserSampleData);
  elements.btnTestFilter.addEventListener('click', runFilterTest);

  elements.btnSave.addEventListener('click', saveAllSettings);
  elements.btnReset.addEventListener('click', () => {
    if (confirm('Khôi phục lại toàn bộ cài đặt về mặc định?')) {
      loadPresetKeywords();
      saveAllSettings();
    }
  });
});

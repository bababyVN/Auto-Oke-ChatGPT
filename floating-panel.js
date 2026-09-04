// ============================================================
// floating-panel.js — Auto-Pilot Control Center UI
// ChatGPT Script Saver
// 1 Ô nhập duy nhất, Checkbox "Có dàn ý" (lưu preset tự động)
// ============================================================

(function () {
  'use strict';

  if (document.getElementById('script-saver-root')) return;

  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUI);
  } else {
    initUI();
  }

  function initUI() {
    if (document.getElementById('script-saver-root')) return;

    const root = document.createElement('div');
    root.id = 'script-saver-root';

    root.innerHTML = `
      <!-- Panel chính -->
      <div id="script-saver-panel" class="ssp-panel">
        <!-- Header -->
        <div class="ssp-header" id="ssp-header">
          <div class="ssp-header-left">
            <span class="ssp-icon">🎬</span>
            <span class="ssp-title">Auto-Pilot Kịch Bản</span>
          </div>
          <div class="ssp-header-actions">
            <button class="ssp-btn-icon" id="ssp-btn-min" title="Thu nhỏ">_</button>
            <button class="ssp-btn-icon ssp-btn-close" id="ssp-btn-close" title="Ẩn">✕</button>
          </div>
        </div>

        <!-- Body -->
        <div class="ssp-body" id="ssp-body">
          <!-- 1 Ô NHẬP DUY NHẤT -->
          <div class="ssp-form-group">
            <div class="ssp-label-row">
              <label for="ssp-input-content">Nội dung kịch bản (Dòng đầu là Tiêu đề):</label>
              <button type="button" id="ssp-btn-sample" class="ssp-btn-link">Dán bài mẫu</button>
            </div>
            <textarea 
              id="ssp-input-content" 
              class="ssp-textarea" 
              rows="5" 
              placeholder="Dán toàn bộ nội dung kịch bản vào đây...&#10;Dòng 1: Tiêu đề câu chuyện&#10;Các dòng tiếp theo: Tóm tắt hoặc cốt truyện"
            ></textarea>
          </div>

          <!-- CHECKBOX DÀN Ý (TỰ LƯU PRESET) -->
          <div class="ssp-checkbox-row">
            <label class="ssp-checkbox-label" for="ssp-checkbox-outline" title="Nếu bật: ChatGPT lập dàn ý trước (không lưu dàn ý vào file), sau đó tự động gửi OKE 1 để viết Part 1, OKE 2 cho Part 2...">
              <input type="checkbox" id="ssp-checkbox-outline" class="ssp-checkbox">
              <span>Có dàn ý (Gửi OKE 1, không lưu dàn ý)</span>
            </label>
          </div>

          <div class="ssp-form-row">
            <div class="ssp-form-col">
              <label for="ssp-input-parts">Số phần (Parts):</label>
              <input type="number" id="ssp-input-parts" class="ssp-input" value="12" min="1" max="50">
            </div>
            <div class="ssp-form-col">
              <label for="ssp-input-pattern" title="Mẫu câu lệnh gửi tiếp theo, dùng {n} đại diện cho số phân đoạn">Lệnh tiếp theo:</label>
              <input type="text" id="ssp-input-pattern" class="ssp-input" value="OKE {n}">
            </div>
          </div>

          <!-- Thanh tiến trình -->
          <div class="ssp-progress-box" id="ssp-progress-box" style="display:none">
            <div class="ssp-progress-header">
              <span id="ssp-progress-text">Part 0/12</span>
              <span id="ssp-progress-percent">0%</span>
            </div>
            <div class="ssp-progress-bar-bg">
              <div id="ssp-progress-bar" class="ssp-progress-bar-fill" style="width: 0%"></div>
            </div>
            <div id="ssp-status-msg" class="ssp-status-msg">Sẵn sàng bắt đầu...</div>
          </div>

          <!-- Các nút điều khiển -->
          <div class="ssp-controls-row">
            <button type="button" id="ssp-btn-start" class="ssp-btn ssp-btn-primary">
              🚀 BẮT ĐẦU TỰ ĐỘNG CHẠY
            </button>
            <button type="button" id="ssp-btn-pause" class="ssp-btn ssp-btn-secondary" style="display:none">
              ⏸ Tạm dừng
            </button>
            <button type="button" id="ssp-btn-stop" class="ssp-btn ssp-btn-danger" style="display:none">
              ⏹ Hủy
            </button>
          </div>
        </div>
      </div>

      <!-- Bong bóng thu nhỏ -->
      <div id="script-saver-bubble" class="ssp-mini-bubble hidden" title="Mở Auto-Pilot Kịch bản">
        <span class="ssp-bubble-icon">🎬</span>
        <span id="ssp-bubble-status" class="ssp-bubble-badge">Auto</span>
      </div>
    `;

    document.body.appendChild(root);

    setupDrag();
    setupEvents();
    setupAutoPilotListener();
  }

  // ============================================================
  // SỰ KIỆN KÉO THẢ & THU GỌN
  // ============================================================
  function setupDrag() {
    const panel = document.getElementById('script-saver-panel');
    const header = document.getElementById('ssp-header');
    if (!panel || !header) return;

    header.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'LABEL') return;
      isDragging = true;
      const rect = panel.getBoundingClientRect();
      dragOffset.x = e.clientX - rect.left;
      dragOffset.y = e.clientY - rect.top;
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const x = e.clientX - dragOffset.x;
      const y = e.clientY - dragOffset.y;
      panel.style.left = Math.max(10, Math.min(x, window.innerWidth - panel.offsetWidth - 10)) + 'px';
      panel.style.top = Math.max(10, Math.min(y, window.innerHeight - panel.offsetHeight - 10)) + 'px';
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  function setupEvents() {
    const panel = document.getElementById('script-saver-panel');
    const bubble = document.getElementById('script-saver-bubble');
    const chkOutline = document.getElementById('ssp-checkbox-outline');

    // Khôi phục preset "Có dàn ý" đã lưu trước đó
    if (chkOutline) {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['ssp_has_outline'], (res) => {
          if (res && typeof res.ssp_has_outline !== 'undefined') {
            chkOutline.checked = !!res.ssp_has_outline;
          } else {
            chkOutline.checked = localStorage.getItem('ssp_has_outline') === 'true';
          }
        });
      } else {
        chkOutline.checked = localStorage.getItem('ssp_has_outline') === 'true';
      }

      // Tự động lưu preset mỗi khi tick hoặc untick
      chkOutline.addEventListener('change', () => {
        const isChecked = chkOutline.checked;
        try {
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ ssp_has_outline: isChecked });
          }
        } catch {}
        try {
          localStorage.setItem('ssp_has_outline', isChecked ? 'true' : 'false');
        } catch {}
      });
    }

    // Thu nhỏ / Phóng to
    document.getElementById('ssp-btn-min').addEventListener('click', () => {
      panel.classList.add('ssp-hidden-panel');
      bubble.classList.remove('hidden');
    });

    bubble.addEventListener('click', () => {
      panel.classList.remove('ssp-hidden-panel');
      bubble.classList.add('hidden');
    });

    document.getElementById('ssp-btn-close').addEventListener('click', () => {
      panel.classList.add('ssp-hidden-panel');
      bubble.classList.remove('hidden');
    });

    // Dán mẫu kịch bản
    document.getElementById('ssp-btn-sample').addEventListener('click', () => {
      document.getElementById('ssp-input-content').value = 
`The Korean Mafia Boss Asked Why the Black Maid Locked His Empty Bedroom—Minutes Later, Someone Begged...

SHORT STORY SUMMARY:
The Black maid checks the Mafia Boss’s bedroom, finds it apparently empty, and locks the door from the outside. His guards mock her until several minutes later someone inside begins pounding on the door and demanding to be released. She had noticed the curtains moving even though every window was closed, but she deliberately said nothing so the intruder would believe he remained undiscovered. When they open the room, the person trapped inside is not an assassin—it is someone the boss trusted enough to possess a private key.`;
      document.getElementById('ssp-input-parts').value = '12';
      document.getElementById('ssp-input-pattern').value = 'OKE {n}';
    });

    // Bắt đầu chạy Auto
    document.getElementById('ssp-btn-start').addEventListener('click', () => {
      const content = document.getElementById('ssp-input-content').value.trim();
      const totalParts = document.getElementById('ssp-input-parts').value.trim();
      const nextPromptPattern = document.getElementById('ssp-input-pattern').value.trim();
      const hasOutline = chkOutline ? chkOutline.checked : false;

      if (!content) {
        alert('Vui lòng dán nội dung kịch bản vào ô!');
        return;
      }

      window.dispatchEvent(new CustomEvent('scriptSaverAutoPilotAction', {
        detail: {
          action: 'START',
          config: { content, totalParts, nextPromptPattern, hasOutline }
        }
      }));
    });

    // Tạm dừng / Tiếp tục
    document.getElementById('ssp-btn-pause').addEventListener('click', (e) => {
      const btn = e.target;
      if (btn.textContent.includes('Tạm dừng')) {
        window.dispatchEvent(new CustomEvent('scriptSaverAutoPilotAction', { detail: { action: 'PAUSE' } }));
        btn.textContent = '▶ Tiếp tục';
      } else {
        window.dispatchEvent(new CustomEvent('scriptSaverAutoPilotAction', { detail: { action: 'RESUME' } }));
        btn.textContent = '⏸ Tạm dừng';
      }
    });

    // Hủy
    document.getElementById('ssp-btn-stop').addEventListener('click', () => {
      if (confirm('Bạn có chắc muốn hủy tiến trình Auto-Pilot này?')) {
        window.dispatchEvent(new CustomEvent('scriptSaverAutoPilotAction', { detail: { action: 'STOP' } }));
      }
    });
  }

  // ============================================================
  // ĐỒNG BỘ TIẾN TRÌNH TỪ CONTENT.JS
  // ============================================================
  function setupAutoPilotListener() {
    window.addEventListener('scriptSaverAutoPilotUpdate', (e) => {
      const data = e.detail;
      if (!data) return;

      const progressBox = document.getElementById('ssp-progress-box');
      const progressText = document.getElementById('ssp-progress-text');
      const progressPercent = document.getElementById('ssp-progress-percent');
      const progressBar = document.getElementById('ssp-progress-bar');
      const statusMsg = document.getElementById('ssp-status-msg');
      const btnStart = document.getElementById('ssp-btn-start');
      const btnPause = document.getElementById('ssp-btn-pause');
      const btnStop = document.getElementById('ssp-btn-stop');
      const bubbleStatus = document.getElementById('ssp-bubble-status');

      if (data.status === 'RUNNING' || data.status === 'PAUSED') {
        progressBox.style.display = 'block';
        btnStart.style.display = 'none';
        btnPause.style.display = 'inline-flex';
        btnStop.style.display = 'inline-flex';

        if (data.currentPart === 0) {
          progressText.textContent = `Dàn ý (Outline)`;
          progressPercent.textContent = `0%`;
          progressBar.style.width = `5%`;
        } else {
          progressText.textContent = `Part ${data.currentPart}/${data.totalParts}`;
          progressPercent.textContent = `${data.progressPercent}%`;
          progressBar.style.width = `${data.progressPercent}%`;
        }

        if (data.statusMessage) {
          statusMsg.textContent = data.statusMessage;
        }
        if (bubbleStatus) {
          bubbleStatus.textContent = data.currentPart === 0 ? 'Dàn ý' : `${data.currentPart}/${data.totalParts}`;
        }
      } else if (data.status === 'COMPLETED') {
        progressBox.style.display = 'block';
        btnStart.style.display = 'block';
        btnStart.textContent = '✓ ĐÃ XONG! BẮT ĐẦU BÀI MỚI';
        btnPause.style.display = 'none';
        btnStop.style.display = 'none';

        progressBar.style.width = '100%';
        progressPercent.textContent = '100%';
        statusMsg.textContent = data.statusMessage || 'Đã hoàn tất kịch bản và tải file .txt!';
        if (bubbleStatus) bubbleStatus.textContent = 'DONE';
      } else {
        // IDLE
        btnStart.style.display = 'block';
        btnStart.textContent = '🚀 BẮT ĐẦU TỰ ĐỘNG CHẠY';
        btnPause.style.display = 'none';
        btnStop.style.display = 'none';
        progressBox.style.display = 'none';
        if (bubbleStatus) bubbleStatus.textContent = 'Auto';
      }
    });
  }
})();

// ============================================================
// content.js — Auto-Pilot Script Runner & Clean Harvester
// ChatGPT Script Saver
// Hỗ trợ chế độ "Có dàn ý" (Gửi OKE 1, không lưu dàn ý, tiếp tục OKE 2..n)
// ============================================================

(function () {
  'use strict';

  if (window.__scriptSaverInjected) return;
  window.__scriptSaverInjected = true;

  // ============================================================
  // AUTO-PILOT STATE MACHINE
  // ============================================================
  const autoPilotState = {
    status: 'IDLE', // 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED'
    title: '',
    storyContent: '', // Toàn bộ nội dung từ 1 ô nhập liệu duy nhất
    hasOutline: false, // NEW: Có dàn ý hay không
    totalParts: 12,
    currentPart: 0,
    nextPromptPattern: 'OKE {n}',
    harvestedParts: []
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    console.log('[Script Saver Auto-Pilot] Đã khởi động sẵn sàng.');

    window.addEventListener('scriptSaverAutoPilotAction', handleAutoPilotAction);

    try {
      chrome.runtime.onMessage.addListener(handleRuntimeMessage);
    } catch {}
  }

  // ============================================================
  // 1. GIAO TIẾP VÀ NHẬN LỆNH
  // ============================================================
  function handleRuntimeMessage(message, sender, sendResponse) {
    switch (message.type) {
      case 'GET_AUTOPILOT_STATUS':
        sendResponse({ success: true, state: getPublicState() });
        return false;

      case 'START_AUTOPILOT':
        startAutoPilot(message.config);
        sendResponse({ success: true, state: getPublicState() });
        return false;

      case 'PAUSE_AUTOPILOT':
        pauseAutoPilot();
        sendResponse({ success: true, state: getPublicState() });
        return false;

      case 'RESUME_AUTOPILOT':
        resumeAutoPilot();
        sendResponse({ success: true, state: getPublicState() });
        return false;

      case 'STOP_AUTOPILOT':
        stopAutoPilot();
        sendResponse({ success: true, state: getPublicState() });
        return false;

      default:
        return false;
    }
  }

  function handleAutoPilotAction(e) {
    const detail = e.detail || {};
    switch (detail.action) {
      case 'START':
        startAutoPilot(detail.config);
        break;
      case 'PAUSE':
        pauseAutoPilot();
        break;
      case 'RESUME':
        resumeAutoPilot();
        break;
      case 'STOP':
        stopAutoPilot();
        break;
    }
  }

  function getPublicState() {
    return {
      status: autoPilotState.status,
      title: autoPilotState.title,
      hasOutline: autoPilotState.hasOutline,
      currentPart: autoPilotState.currentPart,
      totalParts: autoPilotState.totalParts,
      harvestedCount: autoPilotState.harvestedParts.length,
      progressPercent: autoPilotState.totalParts > 0 
        ? Math.round((Math.max(0, autoPilotState.currentPart) / autoPilotState.totalParts) * 100) 
        : 0
    };
  }

  function syncStateToUI(statusMessage = '') {
    window.dispatchEvent(new CustomEvent('scriptSaverAutoPilotUpdate', {
      detail: {
        ...getPublicState(),
        statusMessage
      }
    }));
  }

  // ============================================================
  // 2. BỘ ĐIỀU KHIỂN AUTO-PILOT RUNNER
  // ============================================================

  /**
   * Bắt đầu tiến trình Auto-Pilot từ 1 ô nhập liệu duy nhất
   */
  async function startAutoPilot(config) {
    if (!config || !config.content || !config.content.trim()) {
      showToast('Vui lòng dán nội dung kịch bản vào ô nhập liệu!', 'error');
      return;
    }

    const rawContent = config.content.trim();
    const lines = rawContent.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    // Dòng đầu tiên tự động làm Tiêu đề (dùng để đặt tên file .txt)
    let title = (config.title || lines[0] || 'Kich ban ChatGPT').trim();
    title = title.replace(/^(TITLE|Title|Tiêu đề|TIÊU ĐỀ|Kịch bản|KỊCH BẢN)\s*[:\-_\.]*\s*/i, '').trim();

    autoPilotState.status = 'RUNNING';
    autoPilotState.title = title;
    autoPilotState.storyContent = rawContent;
    autoPilotState.hasOutline = !!config.hasOutline;
    autoPilotState.totalParts = parseInt(config.totalParts, 10) || 12;
    autoPilotState.nextPromptPattern = config.nextPromptPattern || 'OKE {n}';
    autoPilotState.harvestedParts = [];

    if (autoPilotState.hasOutline) {
      // Chế độ Có Dàn Ý:
      // Bước 0: Gửi nội dung để ChatGPT lập dàn ý trước, KHÔNG lưu phản hồi này
      autoPilotState.currentPart = 0;
      syncStateToUI(`Đang gửi yêu cầu lập dàn ý (sẽ không lưu dàn ý)...`);
      showToast(`Bắt đầu Auto-Pilot (Có Dàn ý): ${autoPilotState.title.substring(0, 40)}...`, 'info');
      await executeStep(autoPilotState.storyContent, 0, true);
    } else {
      // Chế độ Trực tiếp:
      // Bước 1: Gửi nội dung và viết thẳng Part 1
      autoPilotState.currentPart = 1;
      syncStateToUI(`Đang khởi động Part 1/${autoPilotState.totalParts}...`);
      showToast(`Bắt đầu Auto-Pilot: ${autoPilotState.title.substring(0, 45)}...`, 'info');
      await executeStep(autoPilotState.storyContent, 1, false);
    }
  }

  function buildNextPrompt(partNumber, pattern) {
    if (!pattern) return `OKE ${partNumber}`;
    if (pattern.includes('{n}')) {
      return pattern.replace(/\{n\}/g, String(partNumber));
    }
    // Nếu người dùng chỉ nhập "OKE"
    if (pattern.trim().toLowerCase() === 'oke') {
      return `OKE ${partNumber}`;
    }
    return pattern;
  }

  /**
   * Thực hiện gửi một prompt và kiểm tra kỹ lưỡng phản hồi
   * @param {string} promptText - Câu lệnh gửi cho ChatGPT
   * @param {number} partNumber - Số thứ tự phần (0 = Dàn ý, 1..n = Part 1..n)
   * @param {boolean} isOutlineStep - Có phải bước lập dàn ý không
   */
  async function executeStep(promptText, partNumber, isOutlineStep = false) {
    if (autoPilotState.status !== 'RUNNING') return;

    if (isOutlineStep) {
      syncStateToUI(`Đang gửi nội dung để ChatGPT lập dàn ý...`);
    } else {
      syncStateToUI(`Đang gửi câu lệnh cho Part ${partNumber}/${autoPilotState.totalParts}...`);
    }

    // 1. Điền nội dung vào ô chat của ChatGPT
    const inputFilled = setChatGptInput(promptText);
    if (!inputFilled) {
      syncStateToUI(`Không tìm thấy ô nhập liệu của ChatGPT. Đang thử lại...`);
      await delay(2000);
      if (autoPilotState.status === 'RUNNING') {
        executeStep(promptText, partNumber, isOutlineStep);
      }
      return;
    }

    await delay(600);

    // 2. Bấm nút Gửi
    const sent = clickSendButton();
    if (!sent) {
      syncStateToUI(`Đang chờ nút Gửi khả dụng...`);
      await delay(1500);
      clickSendButton();
    }

    if (isOutlineStep) {
      syncStateToUI(`Đang chờ ChatGPT lập dàn ý...`);
    } else {
      syncStateToUI(`Đang chờ ChatGPT viết Part ${partNumber}/${autoPilotState.totalParts}...`);
    }

    // 3. Canh cho đến khi ChatGPT viết xong hoàn toàn và ổn định
    waitForGenerationComplete(async () => {
      if (autoPilotState.status !== 'RUNNING') return;

      syncStateToUI(isOutlineStep ? `Đang kiểm tra dàn ý...` : `Đang kiểm tra nội dung Part ${partNumber}...`);
      await delay(1000);

      // 4. Thu hoạch phản hồi mới nhất
      const cleanPart = harvestLatestCleanResponse();

      // ============================================================
      // BẢO VỆ CHỐNG GỬI NHẦM OKE KHI CHATGPT HỎI LẠI (FOLLOW-UP GUARD)
      // ============================================================
      if (isFollowUpQuestion(cleanPart)) {
        console.warn('[Script Saver Auto-Pilot] Phát hiện ChatGPT hỏi lại thay vì viết tiếp:', cleanPart);
        syncStateToUI(`ChatGPT vừa hỏi lại. Đang tự động gửi lệnh yêu cầu tiếp tục...`);
        await delay(1800);

        if (autoPilotState.status === 'RUNNING') {
          const reaffirmPrompt = isOutlineStep
            ? `Hãy lập dàn ý kịch bản ngay bây giờ, không cần hỏi lại.`
            : `Hãy viết tiếp nội dung câu chuyện kịch bản cho Part ${partNumber} ngay bây giờ. Viết chi tiết văn xuôi kịch bản, không cần hỏi lại.`;
          executeStep(reaffirmPrompt, partNumber, isOutlineStep);
        }
        return;
      }

      // ============================================================
      // XỬ LÝ DÀN Ý (isOutlineStep === true): BỎ QUA KHÔNG LƯU, GỬI OKE 1
      // ============================================================
      if (isOutlineStep) {
        console.log('[Script Saver Auto-Pilot] Đã nhận dàn ý (không lưu vào tệp kịch bản).');
        syncStateToUI(`Đã xong dàn ý (không lưu). Nghỉ 2 giây trước khi gửi OKE 1...`);
        await delay(2000);

        if (autoPilotState.status === 'RUNNING') {
          autoPilotState.currentPart = 1;
          const nextPrompt = buildNextPrompt(1, autoPilotState.nextPromptPattern); // Sinh "OKE 1"
          executeStep(nextPrompt, 1, false);
        }
        return;
      }

      // ============================================================
      // XỬ LÝ PHÂN ĐOẠN KỊCH BẢN THẬT (isOutlineStep === false)
      // ============================================================
      if (cleanPart && cleanPart.length > 40) {
        autoPilotState.harvestedParts.push(cleanPart);
        console.log(`[Script Saver Auto-Pilot] Đã thu hoạch thành công Part ${partNumber} (${cleanPart.length} ký tự).`);
      }

      // 5. Kiểm tra đã hoàn thành đủ số phần chưa
      if (autoPilotState.currentPart >= autoPilotState.totalParts) {
        finishAutoPilot();
      } else {
        // Tăng part và gửi OKE tiếp theo (OKE 2, OKE 3...)
        autoPilotState.currentPart += 1;
        const nextPartNum = autoPilotState.currentPart;
        const nextPrompt = buildNextPrompt(nextPartNum, autoPilotState.nextPromptPattern);

        syncStateToUI(`Nghỉ 2 giây trước khi gửi ${nextPrompt}...`);
        await delay(2000);

        if (autoPilotState.status === 'RUNNING') {
          executeStep(nextPrompt, nextPartNum, false);
        }
      }
    });
  }

  /**
   * Kiểm tra xem phản hồi của ChatGPT có phải là câu hỏi xác nhận / câu hỏi ngược lại không
   */
  function isFollowUpQuestion(text) {
    if (!text) return true;
    const clean = text.trim();

    if (clean.length < 50) return true;
    if (clean.length > 400) return false;

    const endsWithQuestion = /\?\s*$/.test(clean);
    const questionPatterns = [
      /bạn có muốn/i,
      /có muốn tôi/i,
      /bạn muốn tôi/i,
      /hãy cho tôi biết/i,
      /xác nhận/i,
      /bắt đầu (viết|không)/i,
      /shall i/i,
      /would you like/i,
      /do you want me to/i,
      /should i/i,
      /please confirm/i,
      /let me know before/i
    ];

    return endsWithQuestion || questionPatterns.some(re => re.test(clean));
  }

  /**
   * Hoàn tất toàn bộ kịch bản và tự động xuất file .txt
   */
  function finishAutoPilot() {
    autoPilotState.status = 'COMPLETED';
    syncStateToUI(`Đã hoàn thành xuất sắc ${autoPilotState.totalParts} phần! Đang lưu file...`);
    showToast(`🎉 Đã hoàn thành toàn bộ kịch bản! Đang tải file về máy...`, 'success');

    const fullCleanScript = autoPilotState.harvestedParts.join('\n\n');

    if (chrome.runtime?.id) {
      chrome.runtime.sendMessage({
        type: 'EXPORT_AUTOPILOT_TXT',
        title: autoPilotState.title,
        content: fullCleanScript,
        totalParts: autoPilotState.totalParts
      }, (resp) => {
        if (resp && resp.success) {
          syncStateToUI(`Đã lưu tệp: ${resp.filename}`);
        }
      });
    }
  }

  function pauseAutoPilot() {
    if (autoPilotState.status === 'RUNNING') {
      autoPilotState.status = 'PAUSED';
      syncStateToUI('Đã tạm dừng Auto-Pilot');
      showToast('Đã tạm dừng Auto-Pilot', 'info');
    }
  }

  function resumeAutoPilot() {
    if (autoPilotState.status === 'PAUSED') {
      autoPilotState.status = 'RUNNING';
      syncStateToUI(`Tiếp tục chạy Part ${autoPilotState.currentPart}/${autoPilotState.totalParts}...`);
      showToast('Tiếp tục Auto-Pilot...', 'info');

      if (autoPilotState.currentPart === 0) {
        executeStep(autoPilotState.storyContent, 0, true);
      } else if (autoPilotState.currentPart === 1 && !autoPilotState.hasOutline) {
        executeStep(autoPilotState.storyContent, 1, false);
      } else {
        const prompt = buildNextPrompt(autoPilotState.currentPart, autoPilotState.nextPromptPattern);
        executeStep(prompt, autoPilotState.currentPart, false);
      }
    }
  }

  function stopAutoPilot() {
    autoPilotState.status = 'IDLE';
    syncStateToUI('Đã hủy Auto-Pilot');
    showToast('Đã dừng tiến trình Auto-Pilot', 'info');
  }

  // ============================================================
  // 3. KỸ THUẬT GÕ PHÍM & CẢM BIẾN CANH XONG ỔN ĐỊNH
  // ============================================================

  function setChatGptInput(text) {
    const input = window.DomSelectors ? window.DomSelectors.findPromptInput() : document.querySelector('#prompt-textarea');
    if (!input) return false;

    input.focus();

    if (input.tagName.toLowerCase() === 'textarea') {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      nativeSetter.call(input, text);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      input.innerHTML = '';
      document.execCommand('insertText', false, text);
      if (!input.textContent || input.textContent !== text) {
        input.textContent = text;
      }
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return true;
  }

  function clickSendButton() {
    const btn = window.DomSelectors ? window.DomSelectors.findSendButton() : document.querySelector('button[data-testid="send-button"]');
    if (btn && !btn.disabled) {
      btn.click();
      return true;
    }

    const input = window.DomSelectors ? window.DomSelectors.findPromptInput() : document.querySelector('#prompt-textarea');
    if (input) {
      input.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true
      }));
      return true;
    }
    return false;
  }

  /**
   * Cảm biến canh ChatGPT sinh xong tuyệt đối tin cậy (Yêu cầu ổn định 2.4s liên tục)
   */
  function waitForGenerationComplete(onComplete) {
    let hasStartedGenerating = false;
    let pollAttempts = 0;
    let stableConsecutiveCount = 0;
    let lastTextLength = 0;
    const maxPollAttempts = 400; // ~5-6 phút

    const interval = setInterval(() => {
      if (autoPilotState.status !== 'RUNNING') {
        clearInterval(interval);
        return;
      }

      pollAttempts++;
      const currentlyGenerating = window.DomSelectors ? window.DomSelectors.isGenerating() : false;

      const msgs = window.DomSelectors ? window.DomSelectors.findAssistantMessages() : [];
      const currentMsg = msgs.length ? msgs[msgs.length - 1] : null;
      const currentTextLength = currentMsg ? currentMsg.textContent.length : 0;

      if (currentlyGenerating) {
        hasStartedGenerating = true;
        stableConsecutiveCount = 0;
      }

      if (hasStartedGenerating && !currentlyGenerating) {
        if (currentTextLength > 0 && currentTextLength === lastTextLength) {
          stableConsecutiveCount++;
        } else {
          stableConsecutiveCount = 0;
        }
        lastTextLength = currentTextLength;

        if (stableConsecutiveCount >= 3) {
          clearInterval(interval);
          setTimeout(onComplete, 1000);
          return;
        }
      } else {
        lastTextLength = currentTextLength;
      }

      if (pollAttempts > 18 && !hasStartedGenerating && !currentlyGenerating) {
        clickSendButton();
      }

      if (pollAttempts >= maxPollAttempts) {
        clearInterval(interval);
        console.warn('[Script Saver Auto-Pilot] Quá thời gian chờ phản hồi.');
        setTimeout(onComplete, 1000);
      }
    }, 800);
  }

  /**
   * Thu hoạch và lọc sạch nội dung phản hồi mới nhất
   */
  function harvestLatestCleanResponse() {
    const assistantElements = window.DomSelectors 
      ? window.DomSelectors.findAssistantMessages() 
      : document.querySelectorAll('[data-message-author-role="assistant"]');

    if (!assistantElements || !assistantElements.length) return '';

    const latestEl = assistantElements[assistantElements.length - 1];
    const rawText = window.DomSelectors 
      ? window.DomSelectors.extractMessageText(latestEl) 
      : latestEl.textContent.trim();

    if (!rawText) return '';

    let cleanText = rawText;
    if (window.TextFilter) {
      const keywords = window.TextFilter.getDefaultKeywords();
      const regexes = window.TextFilter.getDefaultRegexPatterns();
      cleanText = window.TextFilter.filterText(rawText, keywords, regexes, 'remove-line');
    }

    cleanText = cleanText.replace(/^(Edit|Chỉnh sửa)\s*\n*/i, '').trim();

    return cleanText;
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function showToast(msg, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'script-saver-toast';
    toast.innerHTML = `<span style="margin-right:6px">🎬</span> ${msg}`;
    toast.style.cssText = `
      position: fixed;
      bottom: 90px;
      right: 24px;
      background: ${type === 'error' ? '#ef4444' : '#10a37f'};
      color: #ffffff;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      z-index: 9999999;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
      transition: all 0.25s ease-out;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  window.__scriptSaverAutoPilot = {
    getState: getPublicState,
    start: startAutoPilot,
    pause: pauseAutoPilot,
    resume: resumeAutoPilot,
    stop: stopAutoPilot
  };
})();

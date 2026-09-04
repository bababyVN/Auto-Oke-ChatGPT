/**
 * ============================================================
 * ChatGPT Script Saver - dom-selectors.js
 * Hệ thống CSS Selectors tối ưu cho Auto-Pilot (Input, Send, Stop, Messages)
 * Bảo toàn 100% xuống dòng kịch bản, lời thoại và phân đoạn
 * Loại bỏ triệt để nút Edit, Toolbar, Action bars và Suggestion chips
 * ============================================================
 */

const SELECTORS = {
  // 1. Khung nhập liệu prompt (hỗ trợ cả textarea và contenteditable của ChatGPT)
  inputSelectors: [
    '#prompt-textarea',
    'div[contenteditable="true"]',
    'textarea[placeholder*="Message"]',
    'textarea',
    '[role="textbox"]'
  ],

  // 2. Nút bấm gửi (Send button)
  sendButtonSelectors: [
    'button[data-testid="send-button"]',
    'button[aria-label="Send prompt"]',
    'button[aria-label="Send message"]',
    'button[aria-label*="Send"]',
    'form button[type="submit"]',
    'button:has(svg path[d*="M0 0h24v24H0z"])'
  ],

  // 3. Nút Dừng tạo câu trả lời (Stop generating button)
  stopButtonSelectors: [
    '[aria-label="Stop generating"]',
    '[data-testid="stop-button"]',
    'button[aria-label*="Stop"]'
  ],

  // 4. Phản hồi của ChatGPT (Assistant messages)
  assistantSelectors: [
    '[data-message-author-role="assistant"]',
    'article [data-message-author-role="assistant"]',
    '.agent-turn'
  ],

  // 5. Nội dung văn bản Markdown
  contentSelectors: [
    '[data-message-author-role="assistant"] .markdown',
    '.markdown',
    '[class*="prose"]',
    '.prose',
    '.whitespace-pre-wrap'
  ],

  // 6. Tiêu đề cuộc trò chuyện
  titleSelectors: [
    'nav a[class*="active"]',
    'nav li[class*="bg-"] a',
    'nav ol li a[href*="/c/"]',
    'nav a[aria-current="page"]'
  ]
};

/**
 * Tìm ô nhập liệu của ChatGPT
 */
function findPromptInput() {
  for (const selector of SELECTORS.inputSelectors) {
    const el = document.querySelector(selector);
    if (el && el.offsetParent !== null) {
      return el;
    }
  }
  return null;
}

/**
 * Tìm nút Gửi (Send Button)
 */
function findSendButton() {
  for (const selector of SELECTORS.sendButtonSelectors) {
    try {
      const btn = document.querySelector(selector);
      if (btn && btn.offsetParent !== null) {
        return btn;
      }
    } catch {
      // bỏ qua lỗi selector
    }
  }
  return null;
}

/**
 * Kiểm tra xem ChatGPT có đang trong quá trình sinh chữ không
 */
function isGenerating() {
  for (const selector of SELECTORS.stopButtonSelectors) {
    const stopBtn = document.querySelector(selector);
    if (stopBtn && stopBtn.offsetParent !== null) {
      return true;
    }
  }
  return false;
}

/**
 * Tìm tất cả các phản hồi của Assistant
 */
function findAssistantMessages() {
  for (const selector of SELECTORS.assistantSelectors) {
    try {
      const elements = document.querySelectorAll(selector);
      if (elements && elements.length > 0) {
        return Array.from(elements);
      }
    } catch {}
  }
  return [];
}

/**
 * Lấy nội dung văn bản từ một phần tử phản hồi:
 * - BẢO TOÀN NGUYÊN VẸN TẤT CẢ CÁC ĐOẠN VĂN, LỜI THOẠI VÀ KÝ TỰ XUỐNG DÒNG
 * - LOẠI BỎ sạch nút Edit, Copy, Toolbar, Action bars và Suggestion chips gợi ý ở cuối
 */
function extractMessageText(messageElement) {
  if (!messageElement) return '';

  let targetEl = null;
  for (const selector of SELECTORS.contentSelectors) {
    const el = messageElement.querySelector(selector);
    if (el) {
      targetEl = el;
      break;
    }
  }
  if (!targetEl) targetEl = messageElement;

  // Clone node để không can thiệp DOM gốc trên trang
  const clone = targetEl.cloneNode(true);

  // 1. Xóa bỏ tất cả các nút bấm, icon, toolbar, suggestion chips (gợi ý tiếp theo của ChatGPT)
  const unwantedSelectors = [
    'button',
    '[role="button"]',
    'svg',
    'header',
    'nav',
    '[class*="toolbar"]',
    '[class*="action"]',
    '[class*="header"]',
    '[class*="footer"]',
    '[class*="suggestion"]',
    '[class*="followup"]',
    '[class*="prompt-suggestion"]',
    '[data-testid*="suggestion"]',
    '[data-testid*="followup"]',
    '[aria-label*="Edit"]',
    '[aria-label*="Copy"]',
    '[aria-label*="Download"]'
  ];

  unwantedSelectors.forEach(sel => {
    try {
      clone.querySelectorAll(sel).forEach(el => el.remove());
    } catch {}
  });

  // 2. CHUYỂN ĐỔI CÁC THẺ HTML THÀNH KÝ TỰ XUỐNG DÒNG THẬT (FIX LỖI DÍNH LIỀN MỘT CỤC)
  // Thẻ ngắt dòng <br> -> \n
  clone.querySelectorAll('br').forEach(br => {
    try { br.replaceWith('\n'); } catch {}
  });

  // Thẻ đoạn văn <p>, tiêu đề <h1>-<h6>, trích dẫn <blockquote>, <pre> -> chèn \n\n sau mỗi thẻ
  clone.querySelectorAll('p, h1, h2, h3, h4, h5, h6, blockquote, pre').forEach(block => {
    try {
      block.after('\n\n');
    } catch {
      try { block.insertAdjacentText('afterend', '\n\n'); } catch {}
    }
  });

  // Thẻ danh sách <li>, hàng bảng <tr> -> chèn \n
  clone.querySelectorAll('li, tr').forEach(item => {
    try {
      item.after('\n');
    } catch {
      try { item.insertAdjacentText('afterend', '\n'); } catch {}
    }
  });

  // 3. Lấy textContent đã có đầy đủ ký tự ngắt dòng giữa các đoạn
  let rawText = clone.textContent || '';

  // 4. Chuẩn hóa khoảng trắng từng dòng nhưng GIỮ NGUYÊN các dòng phân đoạn
  const lines = rawText.split(/\r?\n/).map(line => line.trim());
  let text = lines.join('\n');

  // Giữ tối đa 2 dấu xuống dòng liên tiếp (= 1 dòng trống phân cách giữa các đoạn kịch bản)
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  // Loại bỏ từ Edit nếu nó đứng đơn độc ở dòng đầu tiên
  text = text.replace(/^(Edit|Chỉnh sửa)\s*\n+/i, '').trim();

  return text;
}

// Module Export
const DomSelectors = {
  SELECTORS,
  findPromptInput,
  findSendButton,
  isGenerating,
  findAssistantMessages,
  extractMessageText
};

if (typeof window !== 'undefined') {
  window.SELECTORS = SELECTORS;
  window.DomSelectors = DomSelectors;
}
if (typeof globalThis !== 'undefined') {
  globalThis.SELECTORS = SELECTORS;
  globalThis.DomSelectors = DomSelectors;
}

// ============================================================
// background.js — Service Worker (Manifest V3)
// ChatGPT Script Saver
// Quản lý xuất file Auto-Pilot .txt UTF-8 BOM & Lưu trữ lịch sử
// ============================================================

const STORAGE_INDEX_KEY = 'conversations_index';
const CONV_PREFIX = 'conv_';
const SETTINGS_KEY = 'settings';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(res => sendResponse(res))
    .catch(err => {
      console.error('[Background] Error:', err);
      sendResponse({ success: false, error: err.message });
    });
  return true;
});

async function handleMessage(message) {
  switch (message.type) {
    case 'EXPORT_AUTOPILOT_TXT':
      return await exportAutoPilotTxt(message);

    case 'EXPORT_TXT':
      return await exportManualTxt(message);

    case 'GET_ALL_CONVERSATIONS':
      return await getAllConversations();

    case 'GET_CONVERSATION':
      return await getConversation(message.conversationId);

    case 'DELETE_CONVERSATION':
      return await deleteConversation(message.conversationId);

    case 'CLEAR_ALL':
      return await clearAll();

    default:
      return { success: false, error: `Unknown message: ${message.type}` };
  }
}

// ============================================================
// 1. TỰ ĐỘNG XUẤT TỆP CHO AUTO-PILOT
// ============================================================
async function exportAutoPilotTxt({ title, content, totalParts }) {
  if (!content) {
    return { success: false, error: 'Nội dung kịch bản rỗng' };
  }

  const cleanTitle = (title || 'Kich_ban_ChatGPT').trim();
  const filename = sanitizeFilename(cleanTitle) + '.txt';

  // Lưu vào lịch sử
  const convId = 'autopilot_' + Date.now();
  await saveCompletedScriptToHistory(convId, cleanTitle, content, totalParts);

  // Chuẩn bị UTF-8 BOM (\uFEFF) cho Notepad Windows không lỗi font tiếng Việt
  const contentWithBOM = '\uFEFF' + content;
  const base64Content = utf8ToBase64(contentWithBOM);
  const dataUrl = `data:text/plain;charset=utf-8;base64,${base64Content}`;

  try {
    const downloadId = await chrome.downloads.download({
      url: dataUrl,
      filename: filename,
      saveAs: false // Tự động lưu thẳng vào thư mục Downloads mà không cần hỏi
    });

    // Cập nhật badge
    await chrome.action.setBadgeText({ text: 'DONE' });
    await chrome.action.setBadgeBackgroundColor({ color: '#10a37f' });

    return {
      success: true,
      filename,
      downloadId
    };
  } catch (err) {
    console.error('[Background] Download error:', err);
    return { success: false, error: err.message };
  }
}

// ============================================================
// 2. XUẤT THỦ CÔNG
// ============================================================
async function exportManualTxt({ conversationId }) {
  if (!conversationId) return { success: false, error: 'Thiếu conversationId' };

  const convKey = CONV_PREFIX + conversationId;
  const result = await chrome.storage.local.get([convKey]);
  const convData = result[convKey];

  if (!convData || !convData.responses || !convData.responses.length) {
    return { success: false, error: 'Không tìm thấy dữ liệu kịch bản' };
  }

  const filename = sanitizeFilename(convData.title) + '.txt';
  const text = convData.responses.join('\n\n');
  const contentWithBOM = '\uFEFF' + text;
  const base64Content = utf8ToBase64(contentWithBOM);
  const dataUrl = `data:text/plain;charset=utf-8;base64,${base64Content}`;

  try {
    const downloadId = await chrome.downloads.download({
      url: dataUrl,
      filename: filename,
      saveAs: true
    });
    return { success: true, filename, downloadId };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ============================================================
// 3. LƯU LỊCH SỬ KỊCH BẢN
// ============================================================
async function saveCompletedScriptToHistory(conversationId, title, content, totalParts) {
  const convKey = CONV_PREFIX + conversationId;
  const now = new Date().toISOString();

  const convData = {
    conversationId,
    id: conversationId,
    title,
    category: 'Auto-Pilot Script',
    responses: [content],
    totalParts: totalParts || 12,
    createdAt: now,
    updatedAt: now
  };

  const result = await chrome.storage.local.get([STORAGE_INDEX_KEY]);
  const index = result[STORAGE_INDEX_KEY] || [];

  index.unshift({
    conversationId,
    id: conversationId,
    title,
    category: 'Auto-Pilot Script',
    responseCount: totalParts || 12,
    createdAt: now,
    updatedAt: now
  });

  await chrome.storage.local.set({
    [convKey]: convData,
    [STORAGE_INDEX_KEY]: index
  });
}

async function getAllConversations() {
  const result = await chrome.storage.local.get([STORAGE_INDEX_KEY]);
  const index = result[STORAGE_INDEX_KEY] || [];
  index.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  return { success: true, conversations: index };
}

async function getConversation(conversationId) {
  if (!conversationId) return { success: false, error: 'Thiếu id' };
  const convKey = CONV_PREFIX + conversationId;
  const result = await chrome.storage.local.get([convKey]);
  return { success: true, data: result[convKey] || null };
}

async function deleteConversation(conversationId) {
  if (!conversationId) return { success: false, error: 'Thiếu id' };
  const convKey = CONV_PREFIX + conversationId;
  await chrome.storage.local.remove(convKey);

  const result = await chrome.storage.local.get([STORAGE_INDEX_KEY]);
  const index = (result[STORAGE_INDEX_KEY] || []).filter(c => c.conversationId !== conversationId && c.id !== conversationId);
  await chrome.storage.local.set({ [STORAGE_INDEX_KEY]: index });
  return { success: true };
}

async function clearAll() {
  await chrome.storage.local.clear();
  return { success: true };
}

// ============================================================
// 4. TIỆN ÍCH
// ============================================================
function sanitizeFilename(title) {
  if (!title) return 'Kich ban ChatGPT';
  let name = title
    // 1. Loại bỏ các tiền tố như TITLE:, Title:, Tiêu đề:
    .replace(/^(TITLE|Title|Tiêu đề|TIÊU ĐỀ|Kịch bản|KỊCH BẢN)\s*[:\-_\.]*\s*/i, '')
    // 2. Loại bỏ các ký tự cấm của Windows: / \ : * ? " < > |
    .replace(/[/\\:*?"<>|]/g, '')
    // 3. Chuẩn hóa khoảng trắng: GIỮ KHOẢNG TRẮNG BÌNH THƯỜNG, BỎ DẤU GẠCH DƯỚI _
    .replace(/\s+/g, ' ')
    // 4. Bỏ dấu gạch dưới hoặc khoảng trắng thừa ở đầu/cuối
    .replace(/^[\s_]+|[\s_]+$/g, '')
    .trim();

  // 5. Giữ độ dài đầy đủ tới 220 ký tự (chuẩn an toàn của Windows), không cắt cụt mất chữ
  if (name.length > 220) {
    name = name.substring(0, 220).trim();
  }

  return name || 'Kich ban ChatGPT';
}

function utf8ToBase64(str) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

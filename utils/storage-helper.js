/**
 * ============================================================
 * ChatGPT Script Saver - storage-helper.js
 * Quản lý lưu trữ bất đồng bộ với chrome.storage API
 * ============================================================
 */

const STORAGE_INDEX_KEY = 'conversations_index';
const CONV_PREFIX = 'conv_';
const SETTINGS_KEY = 'settings';

const StorageHelper = {
  /**
   * Lưu response mới vào cuộc hội thoại
   */
  async saveResponse(conversationId, title, responseText, extraMetadata = {}) {
    if (!conversationId || !responseText) {
      return { success: false, error: 'Thiếu conversationId hoặc responseText' };
    }

    const convKey = CONV_PREFIX + conversationId;
    const now = new Date().toISOString();

    return new Promise((resolve) => {
      chrome.storage.local.get([convKey, STORAGE_INDEX_KEY], (result) => {
        const convData = result[convKey] || {
          conversationId,
          title: title || 'Hội thoại ChatGPT',
          category: extraMetadata.category || '',
          summary: extraMetadata.summary || '',
          responses: [],
          createdAt: now,
          updatedAt: now
        };

        convData.responses.push(responseText);
        convData.updatedAt = now;
        if (title && title !== 'Untitled') convData.title = title;
        if (extraMetadata.category) convData.category = extraMetadata.category;
        if (extraMetadata.summary) convData.summary = extraMetadata.summary;

        // Cập nhật index
        const index = result[STORAGE_INDEX_KEY] || [];
        const existingIdx = index.findIndex(c => (c.conversationId === conversationId || c.id === conversationId));

        const indexItem = {
          conversationId,
          id: conversationId,
          title: convData.title,
          category: convData.category || '',
          summary: convData.summary || '',
          responseCount: convData.responses.length,
          createdAt: convData.createdAt,
          updatedAt: now
        };

        if (existingIdx >= 0) {
          index[existingIdx] = indexItem;
        } else {
          index.unshift(indexItem);
        }

        chrome.storage.local.set({
          [convKey]: convData,
          [STORAGE_INDEX_KEY]: index
        }, () => {
          resolve({
            success: !chrome.runtime.lastError,
            count: convData.responses.length,
            title: convData.title
          });
        });
      });
    });
  },

  /**
   * Lấy thông tin và danh sách responses của 1 conversation
   */
  async getResponses(conversationId) {
    if (!conversationId) return null;
    const convKey = CONV_PREFIX + conversationId;

    return new Promise((resolve) => {
      chrome.storage.local.get([convKey], (result) => {
        resolve(result[convKey] || null);
      });
    });
  },

  /**
   * Lấy danh sách tất cả các cuộc hội thoại (Index)
   */
  async getAllConversations() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_INDEX_KEY], (result) => {
        const index = result[STORAGE_INDEX_KEY] || [];
        index.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
        resolve(index);
      });
    });
  },

  /**
   * Xóa 1 cuộc hội thoại
   */
  async deleteConversation(conversationId) {
    if (!conversationId) return false;
    const convKey = CONV_PREFIX + conversationId;

    return new Promise((resolve) => {
      chrome.storage.local.remove(convKey, () => {
        chrome.storage.local.get([STORAGE_INDEX_KEY], (result) => {
          const index = (result[STORAGE_INDEX_KEY] || []).filter(
            c => c.conversationId !== conversationId && c.id !== conversationId
          );
          chrome.storage.local.set({ [STORAGE_INDEX_KEY]: index }, () => {
            resolve(!chrome.runtime.lastError);
          });
        });
      });
    });
  },

  /**
   * Lấy cài đặt người dùng
   */
  async getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get([SETTINGS_KEY], (result) => {
        resolve(result[SETTINGS_KEY] || this.getDefaultSettings());
      });
    });
  },

  /**
   * Lưu cài đặt người dùng
   */
  async saveSettings(settings) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ [SETTINGS_KEY]: settings }, () => {
        resolve(!chrome.runtime.lastError);
      });
    });
  },

  /**
   * Thiết lập mặc định cho extension
   */
  getDefaultSettings() {
    return {
      keywords: [
        { value: 'Part1', isRegex: false },
        { value: 'Part2', isRegex: false },
        { value: 'Part3', isRegex: false },
        { value: 'Part 1', isRegex: false },
        { value: 'Part 2', isRegex: false },
        { value: 'Part 3', isRegex: false },
        { value: 'đã hoàn thành', isRegex: false },
        { value: 'Đã hoàn thành', isRegex: false },
        { value: 'Tiếp tục', isRegex: false },
        { value: 'Tôi sẽ tiếp tục', isRegex: false },
        { value: 'Tiếp theo', isRegex: false },
        { value: 'Dưới đây là', isRegex: false },
        { value: '(tiếp)', isRegex: false },
        { value: '(hết)', isRegex: false },
        { value: 'OKE\\s*x\\s*\\d+', isRegex: true },
        { value: 'Part\\s*\\d+\\s*[\\/\\-]\\s*\\d+', isRegex: true },
        { value: '---+', isRegex: true }
      ],
      filterMode: 'remove-line', // 'remove-line' | 'remove-keyword'
      exportMode: 'voiceover',   // 'voiceover' (đọc AI) | 'master' (đầy đủ phân cảnh)
      autoSave: true,
      showNotification: true,
      removeBlankLines: true
    };
  },

  /**
   * Xóa toàn bộ dữ liệu hội thoại đã lưu
   */
  async clearAll() {
    return new Promise((resolve) => {
      chrome.storage.local.clear(() => {
        resolve(!chrome.runtime.lastError);
      });
    });
  }
};

// Đăng ký toàn cục
if (typeof window !== 'undefined') {
  window.StorageHelper = StorageHelper;
}
if (typeof globalThis !== 'undefined') {
  globalThis.StorageHelper = StorageHelper;
}

/**
 * ============================================================
 * ChatGPT Script Saver - text-filter.js
 * Bộ lọc văn bản & Xử lý kịch bản chuyên dụng
 * Loại bỏ từ khóa, Part, OKE x12, lời chào AI, và nút "Edit"
 * ============================================================
 */

// 1. Danh sách từ khóa mặc định chuyên dụng cho biên kịch
const DEFAULT_KEYWORDS = [
  // Nút bấm giao diện của ChatGPT
  'Edit',
  'Chỉnh sửa',
  
  // Đánh dấu phân đoạn
  'Part1',
  'Part2',
  'Part3',
  'Part4',
  'Part5',
  'Part 1',
  'Part 2',
  'Part 3',
  'Part 4',
  'Part 5',
  'Hồi 1',
  'Hồi 2',
  'Hồi 3',
  'Phần 1',
  'Phần 2',
  'Phần 3',
  'Cảnh 1',
  'Cảnh 2',
  
  // Thông báo trạng thái của AI
  'đã hoàn thành',
  'Đã hoàn thành',
  'hoàn thành',
  'Tiếp tục',
  'Tôi sẽ tiếp tục',
  'Tiếp theo',
  'Dưới đây là',
  '(tiếp)',
  '(hết)',
  'Xin lỗi vì sự gián đoạn',
  
  // Giao tiếp rác của AI
  'Chắc chắn rồi',
  'Tôi có thể giúp bạn',
  'Bạn có muốn tiếp tục',
  'Hãy cho tôi biết',
  'Hy vọng bạn thích'
];

// 2. Danh sách biểu thức chính quy (Regex) mặc định
const DEFAULT_REGEX_PATTERNS = [
  // Loại bỏ nút Edit, Copy, Chỉnh sửa ở đầu hoặc riêng dòng
  /^(Edit|Chỉnh sửa|Copy|Sao chép)\s*$/gmi,
  /^(Edit|Chỉnh sửa)\s*[:\-\.]?\s*$/gmi,

  // Ghi chú điều khiển kịch bản người dùng (ví dụ: OKE x12, OKE x1)
  /OKE\s*x\s*\d+/gi,
  
  // Đánh dấu Part tỉ lệ: Part 1/12, Part 2/5, Part 1 - 10
  /Part\s*\d+\s*[\/\-]\s*\d+/gi,
  
  // Đánh số phân đoạn đầu dòng: Part 1:, Hồi 1:, Phần 1 -
  /^(Part|Hồi|Phần|Cảnh|Chapter)\s*\d+\s*[:\-\.]/gmi,
  
  // Lời chào mở đầu của AI
  /^(Dưới đây là|Chắc chắn rồi|Tôi xin gửi|Dưới đây là nội dung).*?:/gmi,
  
  // Lời kết hoặc câu hỏi gợi ý của AI ở cuối
  /(Bạn có muốn tôi tiếp tục|Hãy cho tôi biết nếu bạn|Hy vọng câu chuyện).*?(\?|$)/gmi,
  
  // Đường kẻ phân cách markdown (--- hoặc ***)
  /^[\-\*\_]{3,}\s*$/gm
];

/**
 * Lấy danh sách từ khóa mặc định
 */
function getDefaultKeywords() {
  return [...DEFAULT_KEYWORDS];
}

/**
 * Lấy danh sách Regex mặc định
 */
function getDefaultRegexPatterns() {
  return DEFAULT_REGEX_PATTERNS.map(re => new RegExp(re.source, re.flags));
}

/**
 * Thoát ký tự đặc biệt cho chuỗi regex
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Chuẩn hóa các quy tắc lọc từ khóa & regex
 */
function normalizeFilterRules(keywords, regexPatterns) {
  const plainKeywords = [];
  const compiledRegexes = [];

  if (Array.isArray(keywords)) {
    for (const item of keywords) {
      if (!item) continue;
      if (typeof item === 'object' && 'value' in item) {
        if (!item.value) continue;
        if (item.isRegex) {
          try {
            compiledRegexes.push(new RegExp(item.value, 'gi'));
          } catch (e) {
            console.warn('[TextFilter] Regex không hợp lệ:', item.value, e);
          }
        } else {
          plainKeywords.push(item.value);
        }
      } else if (typeof item === 'string') {
        plainKeywords.push(item);
      }
    }
  }

  if (Array.isArray(regexPatterns)) {
    for (const pattern of regexPatterns) {
      if (!pattern) continue;
      if (pattern instanceof RegExp) {
        compiledRegexes.push(new RegExp(pattern.source, pattern.flags || 'gi'));
      } else if (typeof pattern === 'string') {
        try {
          compiledRegexes.push(new RegExp(pattern, 'gi'));
        } catch (e) {
          console.warn('[TextFilter] Regex string không hợp lệ:', pattern, e);
        }
      }
    }
  }

  return { plainKeywords, compiledRegexes };
}

/**
 * Làm sạch các dòng trống dư thừa
 */
function cleanBlankLinesAndWhitespace(text) {
  if (!text || typeof text !== 'string') return '';
  let cleaned = text.replace(/^[ \t]+$/gm, '');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  return cleaned.trim();
}

/**
 * Lọc và làm sạch văn bản theo từ khóa và chế độ lọc
 */
function filterText(
  rawText,
  keywords = getDefaultKeywords(),
  regexPatterns = getDefaultRegexPatterns(),
  mode = 'remove-line'
) {
  if (!rawText || typeof rawText !== 'string') return '';

  const { plainKeywords, compiledRegexes } = normalizeFilterRules(keywords, regexPatterns);
  let filteredText = '';

  if (mode === 'remove-line') {
    const lines = rawText.split(/\r?\n/);
    const keptLines = lines.filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      
      const lowerLine = trimmed.toLowerCase();

      for (const kw of plainKeywords) {
        if (kw && lowerLine.includes(kw.toLowerCase())) {
          return false;
        }
      }

      for (const re of compiledRegexes) {
        re.lastIndex = 0;
        if (re.test(trimmed)) {
          return false;
        }
      }

      return true;
    });

    filteredText = keptLines.join('\n');
  } else {
    let workingText = rawText;

    for (const kw of plainKeywords) {
      if (!kw) continue;
      const re = new RegExp(escapeRegExp(kw), 'gi');
      workingText = workingText.replace(re, '');
    }

    for (const re of compiledRegexes) {
      const flags = re.flags.includes('g') ? re.flags : re.flags + 'g';
      const cleanRe = new RegExp(re.source, flags);
      workingText = workingText.replace(cleanRe, '');
    }

    filteredText = workingText
      .split(/\r?\n/)
      .map(line => line.replace(/[ \t]+$/g, ''))
      .join('\n');
  }

  let cleaned = cleanBlankLinesAndWhitespace(filteredText);

  // Xóa bỏ triệt để từ Edit đứng riêng ở đầu văn bản (nếu còn sót lại)
  cleaned = cleaned.replace(/^(Edit|Chỉnh sửa)\s*\n+/i, '').trim();

  return cleaned;
}

/**
 * Đếm số từ trong văn bản
 */
function countWords(text) {
  if (!text || typeof text !== 'string') return 0;
  const matches = text.trim().match(/[\p{L}\p{N}_\-]+/gu);
  return matches ? matches.length : 0;
}

/**
 * Ước tính thời lượng đọc (WPM 130 từ/phút)
 */
function estimateReadingTime(text, wpm = 130) {
  const words = countWords(text);
  const minutes = Math.ceil(words / wpm);
  if (minutes <= 1) return 'Dưới 1 phút';
  return `Khoảng ${minutes} phút (${words} từ)`;
}

/**
 * Định dạng kịch bản xuất ra
 */
function formatScriptOutput(convData, exportMode = 'voiceover', settings = null) {
  if (!convData || !convData.responses || !convData.responses.length) {
    return '';
  }

  const keywords = settings ? settings.keywords : getDefaultKeywords();
  const mode = settings ? settings.filterMode : 'remove-line';

  const cleanedResponses = convData.responses.map(resp => {
    return filterText(resp, keywords, getDefaultRegexPatterns(), mode);
  }).filter(text => text.length > 0);

  if (exportMode === 'voiceover') {
    return cleanBlankLinesAndWhitespace(cleanedResponses.join('\n\n'));
  }

  const headerLines = [
    '======================================================================',
    `KỊCH BẢN: ${convData.title || 'Untitled'}`,
    convData.category ? `THỂ LOẠI / TAG: ${convData.category}` : '',
    `TỔNG SỐ PHẦN: ${cleanedResponses.length}`,
    `SỐ TỪ ƯỚC TÍNH: ${countWords(cleanedResponses.join(' '))} từ`,
    `THỜI LƯỢNG ĐỌC: ${estimateReadingTime(cleanedResponses.join(' '))}`,
    `CẬP NHẬT: ${new Date(convData.updatedAt || Date.now()).toLocaleString('vi-VN')}`,
    '======================================================================',
    ''
  ].filter(Boolean);

  if (convData.summary) {
    headerLines.push(
      'TÓM TẮT CÂU CHUYỆN (SUMMARY):',
      convData.summary.trim(),
      '----------------------------------------------------------------------',
      ''
    );
  }

  const bodyParts = cleanedResponses.map((part, idx) => {
    return `[PHÂN ĐOẠN ${idx + 1}]\n${part}`;
  });

  return headerLines.join('\n') + '\n\n' + bodyParts.join('\n\n----------------------------------------------------------------------\n\n');
}

// Module Export
const TextFilter = {
  getDefaultKeywords,
  getDefaultRegexPatterns,
  filterText,
  countWords,
  estimateReadingTime,
  formatScriptOutput,
  escapeRegExp,
  cleanBlankLinesAndWhitespace
};

if (typeof window !== 'undefined') {
  window.TextFilter = TextFilter;
}
if (typeof globalThis !== 'undefined') {
  globalThis.TextFilter = TextFilter;
}

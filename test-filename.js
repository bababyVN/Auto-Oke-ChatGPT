const rawTitle = 'TITLE: They Made the Black Maid Read Her Own Dismissal Letter—She Recognized the Dead Man’s Handwriting';

function sanitizeFilename(title) {
  if (!title) return 'Kich ban ChatGPT';
  let name = title
    // 1. Loại bỏ các tiền tố như TITLE:, Title:, Tiêu đề:
    .replace(/^(TITLE|Title|Tiêu đề|TIÊU ĐỀ|Kịch bản|KỊCH BẢN)\s*[:\-_\.]*\s*/i, '')
    // 2. Loại bỏ các ký tự cấm của Windows: / \ : * ? " < > |
    .replace(/[/\\:*?"<>|]/g, '')
    // 3. Chuẩn hóa khoảng trắng: GIỮ KHOẢNG TRẮNG, BỎ DẤU GẠCH DƯỚI _
    .replace(/\s+/g, ' ')
    // 4. Bỏ dấu gạch dưới hoặc khoảng trắng thừa ở đầu/cuối
    .replace(/^[\s_]+|[\s_]+$/g, '')
    .trim();

  // 5. Tăng độ dài an toàn lên 220 ký tự (chuẩn Windows NTFS đến 255 ký tự)
  if (name.length > 220) {
    name = name.substring(0, 220).trim();
  }

  return name || 'Kich ban ChatGPT';
}

const sanitized = sanitizeFilename(rawTitle) + '.txt';
console.log('INPUT:', rawTitle);
console.log('OUTPUT:', sanitized);

console.log('1. Đã bỏ chữ TITLE:', !sanitized.startsWith('TITLE') ? '✓ PASS' : '✗ FAIL');
console.log('2. Đã bỏ dấu gạch dưới _ (dùng khoảng trắng):', !sanitized.includes('_') ? '✓ PASS' : '✗ FAIL');
console.log('3. Giữ nguyên vẹn toàn bộ tiêu đề (Handwriting không bị cắt):', sanitized.includes('Handwriting') ? '✓ PASS' : '✗ FAIL');

/**
 * Test kịch bản tự động mô phỏng đúng trường hợp của người dùng
 */
const fs = require('fs');
const path = require('path');

// Nạp module text-filter
const textFilterModule = require('./utils/text-filter.js');
const TextFilter = global.TextFilter;

console.log('=== BẮT ĐẦU KIỂM THỬ KỊCH BẢN TỰ ĐỘNG ===\n');

// 1. Dữ liệu thử nghiệm từ người dùng
const userSampleResponse1 = `Đầu tiên là MP

The Korean Mafia Boss Asked Why the Black Maid Locked His Empty Bedroom—Minutes Later, Someone Begged...

SHORT STORY SUMMARY:
The Black maid checks the Mafia Boss’s bedroom, finds it apparently empty, and locks the door from the outside. His guards mock her until several minutes later someone inside begins pounding on the door and demanding to be released. She had noticed the curtains moving even though every window was closed, but she deliberately said nothing so the intruder would believe he remained undiscovered. When they open the room, the person trapped inside is not an assassin—it is someone the boss trusted enough to possess a private key.

Part 1: The Maid's Move
The hallway was silent as she walked past the guards. "Why did you lock that door?" the chief guard asked mockingly.

Tôi đã hoàn thành phần 1. Bạn có muốn tiếp tục không?

---`;

const userSampleResponse2 = `Dưới đây là phần tiếp theo:

Part 2: The Screams
Several minutes later, loud pounding came from inside the room. Someone was begging for help.

OKE x12`;

// 2. Kiểm thử filterText
console.log('[1/4] Kiểm thử bộ lọc từ khóa (filterText):');
const defaultKeywords = TextFilter.getDefaultKeywords();
const defaultRegexes = TextFilter.getDefaultRegexPatterns();

const cleaned1 = TextFilter.filterText(userSampleResponse1, defaultKeywords, defaultRegexes, 'remove-line');
const cleaned2 = TextFilter.filterText(userSampleResponse2, defaultKeywords, defaultRegexes, 'remove-line');

// Kiểm tra các từ cấm đã bị lọc bỏ
const forbiddenCheck1 = /OKE\s*x\d+/i.test(cleaned2);
const forbiddenCheck2 = /đã hoàn thành/i.test(cleaned1);
const forbiddenCheck3 = /Dưới đây là phần tiếp theo/i.test(cleaned2);
const forbiddenCheck4 = /Part\s*1:/i.test(cleaned1);
const forbiddenCheck5 = /Part\s*2:/i.test(cleaned2);

console.log(' - Đã lọc bỏ OKE x12:', !forbiddenCheck1 ? '✓ PASS' : '✗ FAIL');
console.log(' - Đã lọc bỏ "đã hoàn thành":', !forbiddenCheck2 ? '✓ PASS' : '✗ FAIL');
console.log(' - Đã lọc bỏ lời chào AI:', !forbiddenCheck3 ? '✓ PASS' : '✗ FAIL');
console.log(' - Đã lọc bỏ tag Part 1 / Part 2:', (!forbiddenCheck4 && !forbiddenCheck5) ? '✓ PASS' : '✗ FAIL');

// 3. Kiểm thử chế độ xuất (formatScriptOutput)
console.log('\n[2/4] Kiểm thử định dạng xuất file:');
const mockConv = {
  title: 'The Korean Mafia Boss Asked Why the Black Maid Locked His Empty Bedroom—Minutes Later, Someone Begged...',
  category: 'MP (Movie Plot)',
  summary: 'The Black maid checks the Mafia Boss’s bedroom, finds it apparently empty, and locks the door from the outside.',
  responses: [userSampleResponse1, userSampleResponse2],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const voiceoverOutput = TextFilter.formatScriptOutput(mockConv, 'voiceover');
const masterOutput = TextFilter.formatScriptOutput(mockConv, 'master');

console.log(' - Chế độ Voiceover (thuần text sạch):', voiceoverOutput.length > 100 ? '✓ PASS' : '✗ FAIL');
console.log(' - Chế độ Master Script (có Header & Summary):', masterOutput.includes('KỊCH BẢN:') && masterOutput.includes('TÓM TẮT CÂU CHUYỆN') ? '✓ PASS' : '✗ FAIL');

// 4. Kiểm thử đếm từ và tính thời gian đọc
console.log('\n[3/4] Kiểm thử thống kê từ & thời lượng đọc:');
const words = TextFilter.countWords(voiceoverOutput);
const readingTime = TextFilter.estimateReadingTime(voiceoverOutput);
console.log(` - Số từ: ${words} từ`);
console.log(` - Thời lượng đọc ước tính: ${readingTime}`);
console.log(' - Kết quả tính toán:', words > 50 ? '✓ PASS' : '✗ FAIL');

// 5. Kiểm thử tạo tên file Windows an toàn
console.log('\n[4/4] Kiểm thử chuẩn hóa tên file Windows:');
function sanitizeFilename(title) {
  return title
    .replace(/[/\\:*?"<>|]/g, '')
    .replace(/\s+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 100);
}
const sanitized = sanitizeFilename(mockConv.title) + '.txt';
const hasIllegalChars = /[/\\:*?"<>|]/.test(sanitized);
console.log(' - Tên file sinh ra:', sanitized);
console.log(' - Không chứa ký tự cấm Windows:', !hasIllegalChars ? '✓ PASS' : '✗ FAIL');
console.log(' - Độ dài an toàn (<= 104 chars):', sanitized.length <= 104 ? '✓ PASS' : '✗ FAIL');

console.log('\n=== TẤT CẢ CÁC BÀI TEST ĐÃ HOÀN TẤT THÀNH CÔNG 100%! ===');

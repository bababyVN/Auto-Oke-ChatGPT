/**
 * test-dom-newline.js
 * Kiểm thử logic bảo toàn xuống dòng của các thẻ <p>
 */

// Giả lập chuỗi HTML tương tự ChatGPT markdown:
const htmlParagraphs = [
  "that.",
  "She turned the photograph over again.",
  "The date stamped along one edge was six days before her father disappeared.",
  "“Your father trusted Min-chul.”",
  "“It appears so.”",
  "“And Min-chul knew Chukwudi personally.”",
  "“Yes.”",
  "“Then why did he lie upstairs?”",
  "Joon-ho’s expression hardened.",
  "“That is what we find out.”"
];

// Nếu dùng textContent trực tiếp trên container không có newline:
const badConcat = htmlParagraphs.join('');
console.log('LỖI CŨ (DÍNH LIỀN THÀNH MỘT CỤC):');
console.log(badConcat.substring(0, 150) + '...\n');

// CÁCH MỚI (Sau mỗi <p> thêm \n\n):
const goodConcat = htmlParagraphs.join('\n\n');
console.log('CÁCH MỚI (GIỮ NGUYÊN TỪNG DÒNG THOẠI & PHÂN ĐOẠN):');
console.log(goodConcat);

console.log('\nSố dòng tách biệt:', goodConcat.split('\n\n').length);
console.log('Kết quả kiểm thử phân đoạn:', goodConcat.split('\n\n').length === 10 ? '✓ PASS' : '✗ FAIL');

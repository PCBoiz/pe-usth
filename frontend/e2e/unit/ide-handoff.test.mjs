/**
 * Unit test cho việc BÀN GIAO MÃ từ bài học sang /ide: src/lib/ide-handoff.ts.
 *
 * Vì sao phải có: nút "Thử ngay trong IDE" mở tab mới với mã nhét trong
 * fragment, và chuỗi đó là dữ liệu đến từ địa chỉ — tức người dùng sửa được.
 * Hai thứ phải đúng, cả hai đều không thấy được bằng mắt:
 *  1. vòng mã hoá → giải mã trả về ĐÚNG từng ký tự, kể cả xuống dòng, nháy và
 *     dấu tiếng Việt (`btoa` thuần ném lỗi với ký tự ngoài Latin-1 — chính chỗ
 *     này là chỗ dễ sai nhất);
 *  2. tham số méo/quá dài KHÔNG được làm trang nổ, phải trả null để IdeClient
 *     giữ ví dụ mặc định.
 *
 * Chạy bằng `node --test` + `.mjs` vì cùng lý do đã ghi ở studio-lesson.test.mjs
 * (frontend cố ý không có runner test; Node tự bóc kiểu TypeScript).
 *
 * Bằng chứng bộ ca này bắt được lỗi thật (quy ước AGENTS.md: gỡ bản sửa ra,
 * test phải trượt) — xem khối chú thích cuối file.
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  MAX_IDE_CODE_CHARS,
  MAX_IDE_PARAM_CHARS,
  decodeIdeCode,
  encodeIdeCode,
  ideCodeHref,
  readIdeCodeFromHash,
} from '../../src/lib/ide-handoff.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const roundTrip = (code) => decodeIdeCode(encodeIdeCode(code));

test('mã hoá → giải mã trả lại đúng từng ký tự: xuống dòng, nháy, dấu tiếng Việt', () => {
  const samples = [
    'print(1+1)\n',
    // Nháy đơn, nháy kép, gạch chéo ngược — thứ hay bị mã hoá sai nhất.
    'print("xin chào")\nprint(\'a\\tb\')\n',
    // Dấu tiếng Việt: btoa() thuần sẽ ném InvalidCharacterError ở đây.
    'print("Tôi là process", os.getpid(), "- cha của tôi là", os.getppid())\n',
    // Khối nhiều dòng có thụt lề và dòng trống (đúng hình dạng mã bài).
    'def ancestors(table, pid):\n    out = [pid]\n\n    while pid:\n        pid = table[pid]\n    return out\n',
    // Ký tự ngoài BMP (4 byte UTF-8, cặp surrogate trong JS).
    'print("xong 🎉")\n',
  ];
  for (const code of samples) assert.equal(roundTrip(code), code, JSON.stringify(code));
});

test('mã THẬT của giáo trình đi qua được: khung main.py và ví dụ của cả 48 bài', () => {
  // Fixture là dữ liệu thật, theo bẫy đã ghi trong AGENTS.md: fixture tự bịa
  // (toàn ASCII, vài chục ký tự) không chứng minh được gì về mã có dấu.
  const dir = join(ROOT, 'scripts', 'pe-v4', 'out-advanced', 'lessons');
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  assert.equal(files.length, 48);
  let checked = 0;
  let withDiacritics = 0;
  let longest = 0;
  for (const f of files) {
    const one = JSON.parse(readFileSync(join(dir, f), 'utf8')).content_json.step_1 ?? {};
    for (const code of [one.brief?.code, one.code?.source]) {
      if (!code) continue;
      checked++;
      longest = Math.max(longest, code.length);
      if (/[^\u0000-\u007f]/.test(code)) withDiacritics++;
      assert.equal(roundTrip(code), code, `${f}: mã bài không đi qua được vòng mã hoá`);
      assert.match(ideCodeHref(code), /^\/ide#code=[A-Za-z0-9_-]+$/, f);
    }
  }
  assert.ok(checked >= 48, `chỉ kiểm được ${checked} đoạn mã — ít bất thường`);
  assert.ok(withDiacritics > 0, 'không đoạn mã thật nào có ký tự ngoài ASCII?');
  // Chốt lại con số dùng để chọn trần: mã dài nhất phải còn cách trần rất xa.
  assert.ok(longest < MAX_IDE_CODE_CHARS / 2, `mã dài nhất ${longest} ký tự — đã sát trần`);
});

test('fragment giữ nguyên ý nghĩa: chỉ dùng ký tự an toàn, không có + / =', () => {
  // Byte 0xfb, 0xff… sinh ra base64 có cả '+' và '/'; biến thể base64url phải
  // đổi chúng, nếu không thì '+' bị hiểu thành dấu cách khi đọc lại.
  const code = 'x = "ÿûÿûÿû"\n'.repeat(20);
  const encoded = encodeIdeCode(code);
  assert.doesNotMatch(encoded, /[+/=]/, 'fragment còn ký tự cần mã hoá lại');
  assert.equal(decodeIdeCode(encoded), code);
  assert.equal(readIdeCodeFromHash(`#code=${encoded}`), code);
  assert.equal(readIdeCodeFromHash(`code=${encoded}`), code, 'thiếu dấu # vẫn phải đọc được');
  assert.equal(readIdeCodeFromHash(`#foo=1&code=${encoded}`), code);
});

test('tham số méo hoặc thiếu thì trả null, KHÔNG ném lỗi (trang phải còn sống)', () => {
  const bad = [
    undefined,
    null,
    '',
    '   ',
    'không-phải-base64', // có ký tự ngoài bảng base64url
    'cHJpbnQ=', // đúng base64 nhưng còn '=' — tham số đã bị sửa tay
    'cHJpbnQ+', // có '+' — không thuộc base64url
    '!!!!',
    'a', // độ dài 1: atob() ném InvalidCharacterError
    '_____', // đúng bảng chữ nhưng giải ra byte không phải UTF-8 hợp lệ
    'AA', // byte 0x00 — ký tự điều khiển, không phải mã Python
    'AAAA',
  ];
  for (const raw of bad) assert.equal(decodeIdeCode(raw), null, JSON.stringify(raw));
  for (const hash of [undefined, '', '#', '#foo=1', '#code=', '#code=!!!'])
    assert.equal(readIdeCodeFromHash(hash), null, JSON.stringify(hash));
});

test('quá dài thì không bàn giao: chặn cả lúc mã hoá và lúc giải mã', () => {
  const ok = 'p'.repeat(MAX_IDE_CODE_CHARS);
  assert.equal(roundTrip(ok), ok, 'đúng bằng trần thì vẫn phải đi qua');
  const tooLong = 'p'.repeat(MAX_IDE_CODE_CHARS + 1);
  assert.equal(encodeIdeCode(tooLong), null);
  assert.equal(ideCodeHref(tooLong), null, 'mã quá dài thì không dựng được link → ẩn nút');
  // Địa chỉ bịa tay dài hơn trần: không được bỏ công giải mã.
  assert.equal(decodeIdeCode('A'.repeat(MAX_IDE_PARAM_CHARS + 1)), null);
  // Và một chuỗi base64url HỢP LỆ giải ra đoạn mã dài quá trần cũng bị chặn.
  const sneaky = Buffer.from('q'.repeat(MAX_IDE_CODE_CHARS + 1), 'utf8').toString('base64url');
  assert.ok(sneaky.length < MAX_IDE_PARAM_CHARS, 'ca này phải lọt qua được trần của tham số');
  assert.equal(decodeIdeCode(sneaky), null);
});

test('mã rỗng hoặc chỉ khoảng trắng thì không có gì để thử', () => {
  // Bài quy trình (dựng môi trường, Git) không có khung main.py — nút phải biến
  // mất, chứ không mở IDE trắng rồi để người học tự đoán.
  for (const code of ['', '   ', '\n\n', '\t']) {
    assert.equal(encodeIdeCode(code), null, JSON.stringify(code));
    assert.equal(ideCodeHref(code), null, JSON.stringify(code));
  }
  // Giải mã cũng không nhận chuỗi rỗng đã mã hoá (tham số dựng tay).
  assert.equal(decodeIdeCode(Buffer.from('   ', 'utf8').toString('base64url')), null);
});

/*
 * BẰNG CHỨNG BẮT ĐƯỢC LỖI (đã chạy, số ca trượt ghi kèm):
 *
 * 1. Bỏ TextEncoder, gọi btoa() thẳng trên chuỗi:
 *      -  bytesToBase64Url(new TextEncoder().encode(code))
 *      +  btoa(code)
 *    → 4/6 ca trượt (vòng mã hoá; mã thật của giáo trình; fragment an toàn;
 *      quá dài):  InvalidCharacterError: Invalid character
 *    Lỗi này có hậu quả thật: gần như mọi bài đều có chú thích tiếng Việt trong
 *    mã, nên nút "Thử ngay" sẽ nổ ngay lúc render màn bài.
 *
 * 2. Bỏ biến thể base64url, trả base64 thường:
 *      -  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
 *    → 4/6 ca trượt: 'fragment giữ nguyên ý nghĩa' (còn '+' và '='), và ba ca
 *      vòng mã hoá/giải mã (chuỗi còn '=' bị decodeIdeCode từ chối).
 *
 * 3. Bỏ hàng rào độ dài lúc giải mã:
 *      -  if (!text.trim() || text.length > MAX_IDE_CODE_CHARS) return null;
 *    → 2/6 ca trượt: 'quá dài…' (ca `sneaky`) và 'mã rỗng…'.
 *
 * 4. Bỏ try/catch trong decodeIdeCode:
 *    → 1/6 ca trượt: 'tham số méo…' nổ InvalidCharacterError thay vì trả null —
 *      đúng cái sẽ làm /ide trắng trang khi ai đó sửa địa chỉ.
 */

/**
 * Thông báo hỏng của trang bài học phải nói ĐÚNG NGUYÊN NHÂN.
 *
 * ===========================================================================
 * SỰ VIỆC ĐÃ ĐO (API production, 15/10/2026)
 * ===========================================================================
 *   GET  /health            → {"status":200,"message":"ok","db":"down"}
 *   POST /auth/guest        → 500
 *   POST /api/v1/auth/guest → 404  (bản deploy phục vụ ở GỐC, không có /v1)
 * Người học đọc được: "Chưa kết nối được bài học — Bài học này cần phiên đăng
 * nhập hợp lệ từ API." Tức một sự cố của MÁY CHỦ bị nói thành lỗi PHIÊN của
 * người đang đọc, nên họ bấm Thử lại mãi hoặc tưởng mình làm sai.
 *
 * ===========================================================================
 * CA NÀO BẮT LỖI GÌ (gỡ bản sửa ra thì đúng những ca này trượt)
 * ===========================================================================
 *  - "DB chết không bị nói thành lỗi phiên" là ca chính: nó dựng lại đúng cảnh
 *    trên (lượt gọi hỏng mang 401 vì `ensureGuest` đánh rơi mã 500, `/health`
 *    báo `db:"down"`) và đòi câu nói ra là câu về máy chủ.
 *  - "lệch gốc API được gọi tên" canh lưới an toàn mới: 404 ở `{origin}/health`
 *    trong khi `{host}/health` trả 200.
 *  - "404 của một bài không tồn tại KHÔNG bị kết tội lệch prefix" là ca chống
 *    dương tính giả — mở /lesson/python_advanced/999 cũng 404 một cách hợp lệ.
 *  - "mọi câu không phải 401 đều không nhắc phiên đăng nhập" soi câu chữ.
 *  - "nối dây" ×3 trượt nếu ai dán lại nhan đề cứng vào JSX, bỏ mã HTTP khỏi
 *    lỗi ném ra, hoặc gỡ lượt dò /health.
 *  - "tiền đề còn đúng" đọc lại `API_PREFIX` ở backend: prefix là 'api' và
 *    KHÔNG có versioning, nên `/api/v1/...` 404 đúng là dấu hiệu lệch bản.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  classifyLoadFailure,
  healthProbeUrls,
  loadFailureCopy,
  NO_SESSION_MESSAGE,
  readProbeDb,
} from '../../src/lib/lesson-load-error.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const FE = join(HERE, '..', '..');
const REPO = join(FE, '..');
const read = (...p) => readFileSync(join(FE, ...p), 'utf8');

const HOOK_SRC = read('src', 'components', 'python-studio', 'useLessonData.ts');
const STUDIO_SRC = read('src', 'components', 'python-studio', 'StudioLesson.tsx');
const API_SRC = read('src', 'lib', 'api.ts');
const GATEWAY_SRC = readFileSync(join(REPO, 'src/api-gateway/api-gateway.setup.ts'), 'utf8');

/** Mọi phép so chữ đi qua đây: NFC + gộp khoảng trắng (xem AGENTS.md). */
const norm = (s) => s.normalize('NFC').replace(/\s+/g, ' ').trim();
const textOf = (c) => norm(`${c.title} ${c.body}`);

/** `/health` khi DB chết — đúng body đo được trên production. */
const PROBE_DB_DOWN = { originStatus: 200, rootStatus: 200, db: 'down' };
/** Máy chủ bình thường. */
const PROBE_OK = { originStatus: 200, rootStatus: 200, db: 'up' };
/** Gốc API mang thêm một đoạn đường không có thật (`…/api/v1`). */
const PROBE_PREFIX_LECH = { originStatus: 404, rootStatus: 200, db: 'down' };

/* ── phân nhánh ───────────────────────────────────────────────────────── */

test('DB chết không bị nói thành lỗi phiên — dù lượt gọi hỏng mang 401', () => {
  // 401 ở đây là 401 của lượt đi KHÔNG MANG token: `ensureGuest()` nhận 500 từ
  // /auth/guest rồi `return null`, nên mã 500 bị đánh rơi và nơi gọi thấy 401.
  const kind = classifyLoadFailure({ status: 401, probe: PROBE_DB_DOWN });
  assert.equal(kind, 'db-down');

  const c = loadFailureCopy(kind, NO_SESSION_MESSAGE);
  // Tự kiểm phép so trên chuỗi CŨ: nếu mẫu này không bắt nổi câu sai thì ca
  // dưới xanh một cách vô nghĩa.
  const DOI_LOI_PHIEN = /phiên đăng nhập/i;
  assert.ok(DOI_LOI_PHIEN.test(norm(NO_SESSION_MESSAGE)), 'mẫu không bắt nổi câu cũ');

  assert.ok(
    !DOI_LOI_PHIEN.test(textOf(c)),
    `câu cho DB chết vẫn đổ lỗi cho phiên của người học: ${textOf(c)}`,
  );
  assert.match(textOf(c), /cơ sở dữ liệu/i);
  // Và nói thẳng đây không phải lỗi của người đọc, kèm việc nên làm.
  assert.match(textOf(c), /không phải/i);
  assert.match(textOf(c), /Thử lại/);
});

test('lệch gốc API được gọi tên, không bị nói thành mất phiên', () => {
  const kind = classifyLoadFailure({ status: 404, probe: PROBE_PREFIX_LECH });
  assert.equal(kind, 'api-path-missing');
  const t = textOf(loadFailureCopy(kind));
  assert.match(t, /404/);
  assert.match(t, /không khớp/i);
  assert.ok(!/phiên đăng nhập/i.test(t), `vẫn nhắc phiên: ${t}`);

  /* Thứ tự xét là một quyết định: hôm 15/10 DB chết VÀ gốc API lệch cùng lúc
     (chính vì vậy `PROBE_PREFIX_LECH.db` là 'down'). Câu của `db-down` bảo
     người ta CHỜ, mà chờ bao lâu cũng không có đường API nào mọc ra — nên
     nhánh cấu hình phải thắng. Đổi thứ tự trong `classifyLoadFailure` là ca
     này đỏ. */
  assert.notEqual(classifyLoadFailure({ status: 401, probe: PROBE_PREFIX_LECH }), 'db-down');
});

test('404 của một bài không tồn tại KHÔNG bị kết tội lệch prefix', () => {
  // Gốc API đặt đúng ⇒ hai lượt dò trùng nhau và đều 200; 404 lúc này nói về
  // BÀI, không nói về gốc. Đây là chỗ dễ dương tính giả nhất của lưới mới.
  assert.notEqual(
    classifyLoadFailure({ status: 404, probe: PROBE_OK }),
    'api-path-missing',
  );
});

test('quá tải, sự cố 5xx, mất mạng và 401 thật — mỗi cái một tên', () => {
  assert.equal(classifyLoadFailure({ status: 429, probe: PROBE_OK }), 'overloaded');
  assert.equal(classifyLoadFailure({ status: 503, probe: PROBE_OK }), 'server-error');
  assert.equal(classifyLoadFailure({ status: 0, probe: null }), 'unreachable');
  // 401 giữ câu cũ: nó là trường hợp DUY NHẤT câu đó nói thật.
  assert.equal(classifyLoadFailure({ status: 401, probe: PROBE_OK }), 'no-session');
  assert.equal(loadFailureCopy('no-session').body, NO_SESSION_MESSAGE);
});

test('mọi câu KHÔNG phải 401 đều không nhắc phiên đăng nhập, và đều nói tới máy chủ', () => {
  for (const kind of ['db-down', 'server-error', 'overloaded', 'api-path-missing', 'unreachable']) {
    const t = textOf(loadFailureCopy(kind));
    assert.ok(!/phiên đăng nhập/i.test(t), `${kind} còn đổ lỗi cho phiên: ${t}`);
    assert.match(t, /máy chủ/i, `${kind} không nói rõ chuyện xảy ra ở máy chủ`);
    // Nhan đề phải nói CÁI GÌ hỏng — nhan đề cũ dùng chung cho mọi nguyên nhân.
    assert.ok(
      norm(loadFailureCopy(kind).title) !== 'Chưa kết nối được bài học',
      `${kind} dùng lại nhan đề gộp của bản cũ`,
    );
  }
  // 429 nói thẳng là quá tải, không gộp vào "sự cố".
  assert.match(textOf(loadFailureCopy('overloaded')), /quá tải/i);
});

test('nhánh unknown dùng nguyên thông điệp gốc, không bịa nguyên nhân', () => {
  const c = loadFailureCopy('unknown', 'Không thể kết nối (418).');
  assert.equal(c.body, 'Không thể kết nối (418).');
  assert.ok(!/cơ sở dữ liệu|quá tải|không khớp/i.test(textOf(c)));
});

/* ── đường dò ─────────────────────────────────────────────────────────── */

test('dò hai đường: gốc đúng thì trùng nhau, gốc mang thêm path thì lệch', () => {
  const dung = healthProbeUrls('https://api.programmingedu.io.vn');
  assert.equal(dung.originUrl, dung.rootUrl);
  assert.equal(dung.rootUrl, 'https://api.programmingedu.io.vn/health');

  // Đúng cấu hình sai đã đo: origin mang thêm /api/v1.
  const lech = healthProbeUrls('https://api.programmingedu.io.vn/api/v1');
  assert.equal(lech.originUrl, 'https://api.programmingedu.io.vn/api/v1/health');
  assert.equal(lech.rootUrl, 'https://api.programmingedu.io.vn/health');

  // Dấu / cuối không được sinh ra //health (404 oan ở một số reverse proxy).
  assert.equal(healthProbeUrls('http://localhost:5000/').originUrl, 'http://localhost:5000/health');
});

test('readProbeDb không tin body có hình dạng nào', () => {
  assert.equal(readProbeDb({ status: 200, message: 'ok', db: 'down' }), 'down');
  assert.equal(readProbeDb({ status: 200, message: 'ok', db: 'up' }), 'up');
  assert.equal(readProbeDb(null), 'unknown');
  assert.equal(readProbeDb('ok'), 'unknown');
  assert.equal(readProbeDb({}), 'unknown');
});

/* ── nối dây ──────────────────────────────────────────────────────────── */

test('nối dây: lỗi ném ra mang theo MÃ HTTP', () => {
  // Mã là thứ duy nhất phân biệt được các sự cố; bản cũ ném Error(message)
  // trần nên tới catch là mất.
  assert.match(HOOK_SRC, /httpError\(NO_SESSION_MESSAGE, 401\)/);
  assert.match(HOOK_SRC, /function httpError\(/);
  assert.ok(
    !/throw new Error\(/.test(HOOK_SRC),
    'còn chỗ ném Error trần trong useLessonData — mã HTTP sẽ mất ở catch',
  );
});

test('nối dây: nhánh hỏng dò /health rồi mới chọn câu', () => {
  assert.match(API_SRC, /export async function probeApiHealth\(/);
  assert.match(HOOK_SRC, /probeApiHealth\(\)/);
  assert.match(HOOK_SRC, /classifyLoadFailure\(\{ status, probe \}\)/);
  // Lượt dò KHÔNG được mang phiên của ai: /health là đường công khai.
  const probe = /export async function probeApiHealth\(\)[\s\S]*?\n\}/.exec(API_SRC);
  assert.ok(probe, 'không đọc được thân probeApiHealth');
  assert.ok(
    !/credentials|Authorization/.test(probe[0]),
    'lượt dò /health đang gửi kèm phiên — nó không được chạm vào phiên của ai',
  );
});

test('nối dây: màn hỏng không còn nhan đề viết cứng cho mọi nguyên nhân', () => {
  const code = STUDIO_SRC.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, '');
  assert.match(code, /loadFailure\?\.title/);
  assert.ok(
    !/info\('Chưa kết nối được bài học'/.test(code),
    'nhan đề gộp lại bị dán cứng vào JSX — chỗ không có test nào soi',
  );
});

test('tiền đề còn đúng: gateway phục vụ ở prefix "api", không có version', () => {
  /* Vì sao đọc lại backend: lưới "lệch gốc API" chỉ có nghĩa khi `/api/v1/...`
     THẬT SỰ không tồn tại. Bật versioning sau này thì 404 trên /api/v1 không
     còn là dấu hiệu lệch bản nữa, và ca này đỏ để người sửa đọc lại câu chữ. */
  assert.match(GATEWAY_SRC, /export const API_PREFIX = 'api';/);
  assert.ok(
    !/enableVersioning\(/.test(GATEWAY_SRC),
    'gateway vừa bật versioning — đọc lại câu "Bản máy chủ không khớp bản trang web"',
  );
});

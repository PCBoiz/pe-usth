#!/usr/bin/env node
// Test nhiều LOẠI code cùng lúc qua runner.
// Mỗi loại có kết quả mong đợi; script kiểm từng lượt có đúng không, và xem loại
// "xấu" (treo, ăn RAM, in vô hạn...) có làm hỏng loại "tốt" chạy cùng lúc không.
//
// Đặt file này ở runner/scripts/mixed-test.mjs. Runner phải đang chạy (npm start).
// Ví dụ:
//   node scripts/mixed-test.mjs --users 80 --spread 20000
//   node scripts/mixed-test.mjs --users 21 --spread 0      (mỗi loại ít nhất 1 lần, dồn cục)
//   node scripts/mixed-test.mjs --only numpy               (chạy đúng 1 loại, in kết quả đầy đủ)
//   node scripts/mixed-test.mjs --list                     (xem danh sách loại)
// Tham số khác: --seed <số> (lặp lại đúng thứ tự ngẫu nhiên), --url <địa chỉ runner>.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------- Đọc .env của runner (không in khóa ra bất kỳ đâu) ----------
const here = dirname(fileURLToPath(import.meta.url));
const envPath = [join(here, '..', '.env'), join(here, '.env')].find((p) => existsSync(p));
if (!envPath) {
  console.error('Không tìm thấy runner/.env. Đặt script trong runner/scripts/.');
  process.exit(1);
}
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_][A-Z0-9_]*=/.test(l))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i), l.slice(i + 1).trim().replace(/^"(.*)"$/, '$1')];
    }),
);
const SECRET = env.RUNNER_SECRET;
if (!SECRET) {
  console.error('runner/.env chưa có RUNNER_SECRET.');
  process.exit(1);
}

// ---------- Tham số dòng lệnh ----------
const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : fallback;
};
const URL_BASE = arg('url', `http://${env.HOST || '127.0.0.1'}:${env.PORT || 8080}`);
const ONLY = arg('only', null);
const USERS = ONLY ? 1 : Number(arg('users', 80));
const SPREAD = ONLY ? 0 : Number(arg('spread', 20000));
const SEED = Number(arg('seed', 1));

// ---------- Các loại code và kết quả mong đợi ----------
const ok0 = (r) => r.exitCode === 0 && !r.timedOut && !r.outputTruncated;
const out = (r) => (r.stdout ?? '').trim();
const err = (r) => r.stderr ?? '';

const CASES = [
  // --- Bài "tốt": phải luôn đúng, kể cả khi bài xấu chạy cùng lúc ---
  { name: 'nhe', weight: 30, note: 'vòng lặp ~0.4 s',
    code: 's = 0\nfor i in range(3_000_000):\n    s += i\nprint(s)',
    expect: (r) => ok0(r) && out(r) === '4499998500000' },
  { name: 'nang_cpu', weight: 5, note: 'vòng lặp ~3-5 s',
    code: 's = 0\nfor i in range(30_000_000):\n    s += i\nprint(s)',
    expect: (r) => ok0(r) && out(r) === '449999985000000' },
  { name: 'numpy', weight: 6,
    code: 'import numpy as np\na = np.arange(1_000_000)\nprint(int(a.sum()))',
    expect: (r) => ok0(r) && out(r) === '499999500000' },
  { name: 'pandas', weight: 4,
    code: 'import pandas as pd\ndf = pd.DataFrame({"x": range(100_000)})\nprint(int(df["x"].sum()))',
    expect: (r) => ok0(r) && out(r) === '4999950000' },
  { name: 'thread', weight: 5,
    code: [
      'import threading',
      'res = []',
      'def work(i):',
      '    res.append(i * i)',
      'ts = [threading.Thread(target=work, args=(i,)) for i in range(4)]',
      'for t in ts:',
      '    t.start()',
      'for t in ts:',
      '    t.join()',
      'print(sorted(res))',
    ].join('\n'),
    expect: (r) => ok0(r) && out(r) === '[0, 1, 4, 9]' },
  { name: 'multiprocess', weight: 4,
    code: [
      'from multiprocessing import Pool',
      '',
      'def sq(x):',
      '    return x * x',
      '',
      'if __name__ == "__main__":',
      '    with Pool(4) as p:',
      '        print(p.map(sq, range(8)))',
    ].join('\n'),
    expect: (r) => ok0(r) && out(r) === '[0, 1, 4, 9, 16, 25, 36, 49]' },
  { name: 'unicode', weight: 3, note: 'tiếng Việt + emoji đi qua đủ đường ống',
    code: 'print("Xin chào 🐍 – tiếng Việt")',
    expect: (r) => ok0(r) && out(r) === 'Xin chào 🐍 – tiếng Việt' },
  { name: 'output_lon', weight: 2, note: '50.000 dòng, dưới trần 1 MB',
    code: 'for i in range(50_000):\n    print(i)',
    expect: (r) => ok0(r) && out(r).split(/\r?\n/).length === 50_000 },
  { name: 'ram_500mb', weight: 2, note: 'dưới giới hạn RAM nên phải chạy được',
    code: 'x = b"x" * (500 * 1024**2)\nprint("ok", len(x) // 1024**2)',
    expect: (r) => ok0(r) && out(r) === 'ok 500' },
  { name: 'ghi_file', weight: 2, note: '/code chỉ đọc, /tmp ghi được',
    code: [
      'try:',
      '    open("/code/x.txt", "w")',
      'except OSError as e:',
      '    print("chan:", e.errno)',
      'open("/tmp/x.txt", "w").write("ok")',
      'print("tmp ok")',
    ].join('\n'),
    expect: (r) => ok0(r) && /chan: 30/.test(out(r)) && /tmp ok/.test(out(r)) },
  { name: 'quyen', weight: 1, note: 'cờ cứng hóa còn hiệu lực',
    code: [
      'for line in open("/proc/self/status"):',
      '    if line.startswith(("CapEff", "NoNewPrivs")):',
      '        print(line.strip())',
    ].join('\n'),
    expect: (r) => ok0(r) && /CapEff:\s+0{16}/.test(out(r)) && /NoNewPrivs:\s+1/.test(out(r)) },

  // --- Lỗi của người học: phải báo lỗi rõ, không làm treo gì ---
  { name: 'loi_cu_phap', weight: 5,
    code: 'print(1 +',
    expect: (r) => r.exitCode === 1 && /SyntaxError/.test(err(r)) },
  { name: 'loi_chia_0', weight: 5,
    code: 'print(1 / 0)',
    expect: (r) => r.exitCode === 1 && /ZeroDivisionError/.test(err(r)) },
  { name: 'de_quy_vo_han', weight: 2,
    code: 'def f(n):\n    return f(n + 1)\nf(0)',
    expect: (r) => r.exitCode === 1 && /RecursionError/.test(err(r)) },
  { name: 'input', weight: 3, note: 'chưa hỗ trợ stdin',
    code: 'name = input()\nprint(name)',
    expect: (r) => r.exitCode === 1 && /EOFError/.test(err(r)) },

  // --- Bài "xấu": phải bị chặn đúng cách ---
  { name: 'vong_lap_vo_han', weight: 2,
    code: 'while True:\n    pass',
    expect: (r) => r.timedOut === true },
  { name: 'ngu_lau', weight: 2, note: 'không tốn CPU nhưng giữ chỗ',
    code: 'import time\ntime.sleep(60)\nprint("dậy")',
    expect: (r) => r.timedOut === true },
  { name: 'in_vo_han', weight: 2,
    code: 'while True:\n    print("x" * 1000)',
    expect: (r) => r.outputTruncated === true },
  { name: 'ram_vuot', weight: 2, note: '3 GB, vượt giới hạn',
    code: 'x = b"x" * (3 * 1024**3)\nprint("không bị chặn")',
    expect: (r) => (r.exitCode === 137 || /MemoryError/.test(err(r))) && !/không bị chặn/.test(out(r)) },
  { name: 'mang', weight: 2, note: 'container không có mạng',
    code: 'import urllib.request\nurllib.request.urlopen("http://example.com", timeout=3)',
    expect: (r) => r.exitCode === 1 && /URLError|resolution|unreachable/i.test(err(r)) },
  { name: 'nhieu_tien_trinh', weight: 1, note: 'chặn ở --pids-limit',
    code: [
      'import subprocess',
      'procs = []',
      'try:',
      '    for _ in range(300):',
      '        procs.append(subprocess.Popen(["sleep", "30"]))',
      'except OSError:',
      '    pass',
      'print(len(procs))',
    ].join('\n'),
    expect: (r) => ok0(r) && Number(out(r)) > 0 && Number(out(r)) < 128 },
];

if (argv.includes('--list')) {
  for (const c of CASES) console.log(`${c.name.padEnd(18)} trọng số ${String(c.weight).padStart(2)}  ${c.note ?? ''}`);
  process.exit(0);
}

// ---------- Chọn loại cho từng người (lặp lại được nhờ --seed) ----------
function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(SEED);
const totalWeight = CASES.reduce((s, c) => s + c.weight, 0);
const pickWeighted = () => {
  let x = rand() * totalWeight;
  for (const c of CASES) if ((x -= c.weight) < 0) return c;
  return CASES[CASES.length - 1];
};

let plan;
if (ONLY) {
  const c = CASES.find((k) => k.name === ONLY);
  if (!c) {
    console.error(`Không có loại "${ONLY}". Xem danh sách bằng --list.`);
    process.exit(1);
  }
  plan = [c];
} else {
  // Mỗi loại có mặt ít nhất một lần (nếu đủ người), phần còn lại chọn theo trọng số.
  plan = CASES.slice(0, Math.min(USERS, CASES.length));
  while (plan.length < USERS) plan.push(pickWeighted());
  plan = plan.map((c) => ({ c, delay: rand() * SPREAD }));
}
if (ONLY) plan = plan.map((c) => ({ c, delay: 0 }));

// ---------- Gửi ----------
async function runOne({ c, delay }, idx) {
  await new Promise((r) => setTimeout(r, delay));
  const t0 = Date.now();
  try {
    const res = await fetch(`${URL_BASE}/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SECRET}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: c.code }),
      signal: AbortSignal.timeout(90_000),
    });
    const body = await res.json().catch(() => ({}));
    const total = Date.now() - t0;
    if (res.status !== 200) return { idx, c, status: res.status, total, body };
    return { idx, c, status: 200, total, body, pass: c.expect(body) };
  } catch (e) {
    return { idx, c, status: 'lỗi mạng', total: Date.now() - t0, body: { message: String(e) } };
  }
}

console.log(`Runner: ${URL_BASE} | ${plan.length} lượt | rải trong ${SPREAD} ms | seed ${SEED}\n`);
const results = await Promise.all(plan.map(runOne));

if (ONLY) {
  const r = results[0];
  console.log(JSON.stringify({ status: r.status, đạt: r.pass, ...r.body }, null, 2));
  process.exit(r.pass ? 0 : 1);
}

// ---------- Tổng kết theo loại ----------
const avg = (a) => (a.length ? Math.round(a.reduce((s, x) => s + x, 0) / a.length) : 0);
const max = (a) => (a.length ? Math.max(...a) : 0);
const rows = CASES.map((c) => {
  const rs = results.filter((r) => r.c === c);
  const ran = rs.filter((r) => r.status === 200);
  return {
    loại: c.name,
    lượt: rs.length,
    đạt: ran.filter((r) => r.pass).length,
    'sai kết quả': ran.filter((r) => !r.pass).length,
    'không chạy': rs.length - ran.length,
    'chờ TB (ms)': avg(ran.map((r) => r.body.queuedMs ?? 0)),
    'chờ max (ms)': max(ran.map((r) => r.body.queuedMs ?? 0)),
    'chạy TB (ms)': avg(ran.map((r) => r.body.durationMs ?? 0)),
  };
}).filter((row) => row.lượt > 0);
console.table(rows);

const notRun = results.filter((r) => r.status !== 200);
const wrong = results.filter((r) => r.status === 200 && !r.pass);
const statusCount = notRun.reduce((m, r) => ((m[r.status] = (m[r.status] ?? 0) + 1), m), {});
console.log(`Tổng: ${results.length} | đạt ${results.filter((r) => r.pass).length} | sai kết quả ${wrong.length} | không chạy ${notRun.length} ${JSON.stringify(statusCount)}`);

const cut = (s) => String(s ?? '').replace(/\s+/g, ' ').slice(0, 160);
if (wrong.length) {
  console.log('\n--- Lượt chạy nhưng SAI kết quả mong đợi ---');
  for (const r of wrong.slice(0, 20)) {
    const b = r.body;
    console.log(`#${r.idx + 1} ${r.c.name}: exit=${b.exitCode} timedOut=${b.timedOut} truncated=${b.outputTruncated}`);
    console.log(`   stdout: ${cut(b.stdout)}`);
    console.log(`   stderr: ${cut(b.stderr)}`);
  }
}
if (notRun.length) {
  console.log('\n--- Lượt KHÔNG được chạy ---');
  for (const r of notRun.slice(0, 20)) console.log(`#${r.idx + 1} ${r.c.name}: ${r.status} ${cut(r.body?.message)}`);
}

// ---------- Container sót? ----------
await new Promise((r) => setTimeout(r, 3000));
try {
  const left = execFileSync('docker', ['ps', '-aq', '--filter', 'name=pyrun-'], { encoding: 'utf8' }).trim();
  const n = left ? left.split(/\s+/).length : 0;
  console.log(`\nContainer pyrun-* còn sót sau 3 giây: ${n}${n ? '  ← cần xem lại' : ''}`);
} catch {
  console.log('\n(Không gọi được docker để kiểm container sót.)');
}

process.exit(wrong.length ? 1 : 0);

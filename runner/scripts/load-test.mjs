#!/usr/bin/env node
/**
 * Load test cho runner: N người bấm "Chạy" rải đều trong một khoảng thời gian, đo
 * bao nhiêu bài chạy được, bao nhiêu bị 429 và mỗi người phải chờ bao lâu.
 *
 *   node scripts/load-test.mjs --users 50 --spread 0 --hang 0.1
 *
 *   --users   số người (mặc định 50)
 *   --spread  khoảng rải thời điểm bấm, ms (mặc định 0 = tất cả cùng lúc). Giờ đến của
 *             từng người ngẫu nhiên đều trong [0, spread].
 *   --hang    tỉ lệ bài treo, 0..1 (mặc định 0). 0.1 = 10% là `while True: pass`, chạy tới
 *             hết giờ và chiếm chỗ suốt PY_RUN_TIMEOUT_MS.
 *   --seed    hạt giống ngẫu nhiên để chạy lại được đúng kịch bản (mặc định 1)
 *   --url     địa chỉ runner (mặc định lấy HOST/PORT trong file .env của runner)
 *   --env-file  file .env chứa RUNNER_SECRET (mặc định runner/.env, cạnh thư mục scripts)
 *   --timeout   ms chờ tối đa một request (mặc định 120000)
 *
 * Bài "thường" là đoạn cộng 3 triệu số (CPU-bound ~0,3 s) để so sánh được với các lần đo cũ.
 * Script gọi THẲNG runner (không qua backend) nên không dính giới hạn 10 lần/phút của backend.
 *
 * KHOÁ: đọc RUNNER_SECRET từ file .env, chỉ dùng trong header Authorization và KHÔNG BAO GIỜ
 * được in ra (mọi thông điệp lỗi đều bị che trước khi in).
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

const NORMAL_CODE = 's = 0\nfor i in range(3_000_000):\n    s += i\nprint(s)\n';
const NORMAL_EXPECTED = String((3_000_000 * 2_999_999) / 2); // 4499998500000
const HANG_CODE = 'while True: pass\n';

// ── tham số ────────────────────────────────────────────────────────────────
const { values: args } = parseArgs({
  options: {
    users: { type: 'string', default: '50' },
    spread: { type: 'string', default: '0' },
    hang: { type: 'string', default: '0' },
    seed: { type: 'string', default: '1' },
    url: { type: 'string' },
    'env-file': { type: 'string', default: resolve(HERE, '..', '.env') },
    timeout: { type: 'string', default: '120000' },
    help: { type: 'boolean', default: false },
  },
});

if (args.help) {
  console.log('Cách dùng: node scripts/load-test.mjs --users 50 --spread 0 --hang 0.1 [--seed 1] [--url http://127.0.0.1:8080]');
  process.exit(0);
}

function num(name, raw, { min, max, integer = false }) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) {
    console.error(`--${name} phải là ${integer ? 'số nguyên' : 'số'} trong [${min}, ${max}] (đang là "${raw}")`);
    process.exit(2);
  }
  return n;
}
const USERS = num('users', args.users, { min: 1, max: 2000, integer: true });
const SPREAD = num('spread', args.spread, { min: 0, max: 3_600_000, integer: true });
const HANG = num('hang', args.hang, { min: 0, max: 1 });
const SEED = num('seed', args.seed, { min: 0, max: 2 ** 31, integer: true });
const TIMEOUT = num('timeout', args.timeout, { min: 1000, max: 600_000, integer: true });

// ── đọc .env (khoá không bao giờ được in) ───────────────────────────────────
function readEnvFile(path) {
  if (!existsSync(path)) return null;
  const out = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m || line.trim().startsWith('#')) continue;
    out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}

const envFile = resolve(args['env-file']);
const env = readEnvFile(envFile);
if (!env) {
  console.error(`Không thấy file ${envFile}. Tạo runner/.env (xem .env.example) hoặc truyền --env-file.`);
  process.exit(2);
}
const SECRET = env.RUNNER_SECRET ?? '';
if (SECRET.length < 32) {
  console.error(`RUNNER_SECRET trong ${envFile} thiếu hoặc ngắn hơn 32 ký tự.`);
  process.exit(2);
}
const host = !env.HOST || env.HOST === '0.0.0.0' ? '127.0.0.1' : env.HOST;
const URL_BASE = (args.url ?? `http://${host}:${env.PORT || 8080}`).replace(/\/+$/, '');

/** Che khoá trong mọi chuỗi trước khi in. */
const redact = (text) => String(text).split(SECRET).join('***');

// ── kịch bản ngẫu nhiên có hạt giống (chạy lại được) ─────────────────────────
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(SEED);

const hangCount = Math.round(USERS * HANG);
const hangIdx = new Set();
{
  const ids = Array.from({ length: USERS }, (_, i) => i);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  ids.slice(0, hangCount).forEach((i) => hangIdx.add(i));
}
const people = Array.from({ length: USERS }, (_, i) => ({
  id: i + 1,
  hang: hangIdx.has(i),
  arrival: SPREAD === 0 ? 0 : Math.floor(rand() * (SPREAD + 1)),
})).sort((a, b) => a.arrival - b.arrival || a.id - b.id);
people.forEach((p, i) => (p.id = i + 1)); // đánh số lại theo thứ tự đến

// ── chạy ────────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runOne(person, t0) {
  await sleep(Math.max(0, person.arrival - (Date.now() - t0)));
  const started = Date.now();
  const row = { ...person, status: 'ERR', queuedMs: null, durationMs: null, totalMs: 0, note: '' };
  try {
    const res = await fetch(`${URL_BASE}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SECRET}` },
      body: JSON.stringify({ code: person.hang ? HANG_CODE : NORMAL_CODE }),
      signal: AbortSignal.timeout(TIMEOUT),
    });
    row.status = res.status;
    const body = await res.json().catch(() => null);
    if (res.status === 200 && body) {
      row.queuedMs = body.queuedMs ?? 0;
      row.durationMs = body.durationMs ?? null;
      if (body.timedOut) row.note = 'hết giờ';
      else if (!person.hang && String(body.stdout).trim() !== NORMAL_EXPECTED) row.note = `SAI kết quả (exit ${body.exitCode})`;
      else if (body.exitCode !== 0) row.note = `exit ${body.exitCode}`;
    } else if (body?.message) {
      row.note = redact(body.message);
    }
  } catch (e) {
    row.note = redact(e instanceof Error ? e.message : e);
  }
  row.totalMs = Date.now() - started;
  return row;
}

// ── thống kê ────────────────────────────────────────────────────────────────
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const max = (xs) => (xs.length ? Math.max(...xs) : 0);
function p95(xs) {
  if (!xs.length) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(0.95 * sorted.length) - 1)]; // nearest-rank
}
const fmt = (ms) => (ms == null ? '-' : String(Math.round(ms)));

console.log(`Load test → ${URL_BASE}  (khoá đã nạp từ ${envFile}, không in ra)`);
console.log(
  `  ${USERS} người, rải ${SPREAD} ms, ${hangCount} bài treo (${(HANG * 100).toFixed(0)}%), hạt giống ${SEED}\n`,
);

const t0 = Date.now();
const rows = await Promise.all(people.map((p) => runOne(p, t0)));
const wall = Date.now() - t0;

console.log('  #  loại    đến(ms)  status  chờ(ms)  chạy(ms)  tổng(ms)  ghi chú');
console.log('  ' + '-'.repeat(76));
for (const r of rows) {
  console.log(
    `${String(r.id).padStart(3)}  ${(r.hang ? 'treo' : 'thường').padEnd(6)}  ${String(r.arrival).padStart(7)}  ${String(r.status).padStart(6)}  ${fmt(r.queuedMs).padStart(7)}  ${fmt(r.durationMs).padStart(8)}  ${fmt(r.totalMs).padStart(8)}  ${r.note}`,
  );
}

const ok = rows.filter((r) => r.status === 200);
const rejected = rows.filter((r) => r.status === 429);
const other = rows.filter((r) => r.status !== 200 && r.status !== 429);
const waits = ok.map((r) => r.queuedMs);
const totals = ok.map((r) => r.totalMs);
const wrong = ok.filter((r) => r.note.startsWith('SAI')).length;
const timedOut = ok.filter((r) => r.note === 'hết giờ').length;

console.log('\nTỔNG KẾT');
console.log(`  chạy được (200)      : ${ok.length}/${USERS}  (${((ok.length / USERS) * 100).toFixed(1)}%)`);
console.log(`  bị từ chối (429)     : ${rejected.length}/${USERS}  (${((rejected.length / USERS) * 100).toFixed(1)}%)`);
console.log(`  lỗi khác             : ${other.length}${other.length ? '  → ' + [...new Set(other.map((r) => `${r.status}${r.note ? ' ' + r.note : ''}`))].join('; ') : ''}`);
console.log(`  chờ hàng đợi (200)   : trung bình ${fmt(avg(waits))} ms | lớn nhất ${fmt(max(waits))} ms | p95 ${fmt(p95(waits))} ms`);
console.log(`  tổng thời gian (200) : trung bình ${fmt(avg(totals))} ms | lớn nhất ${fmt(max(totals))} ms | p95 ${fmt(p95(totals))} ms`);
console.log(`  bài treo hết giờ     : ${timedOut}/${hangCount}`);
console.log(`  bài thường sai kết quả: ${wrong}`);
console.log(`  toàn bộ phiên đo     : ${(wall / 1000).toFixed(1)} s`);

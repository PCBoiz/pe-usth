// Mô phỏng nhiều người dùng gửi code tới runner cùng lúc.
// Cách chạy: node load-test.mjs <số người> <rải đều trong bao nhiêu ms>
import { readFileSync } from 'node:fs';

const URL = 'http://127.0.0.1:8080';
const USERS = Number(process.argv[2] ?? 10);
const SPREAD_MS = Number(process.argv[3] ?? 0);
const secret = readFileSync('.env', 'utf8').match(/^RUNNER_SECRET=(.+)$/m)[1].trim();

// Bài vừa phải: chạy khoảng nửa giây, giống bài tập thường
const CODE = 's = 0\nfor i in range(3_000_000):\n    s += i\nprint(s)';

async function oneUser(id) {
  await new Promise((r) => setTimeout(r, Math.random() * SPREAD_MS));
  const t0 = Date.now();
  try {
    const res = await fetch(`${URL}/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: CODE }),
    });
    return { người: id, status: res.status, ms: Date.now() - t0 };
  } catch {
    return { người: id, status: 'lỗi mạng', ms: Date.now() - t0 };
  }
}

const results = await Promise.all(Array.from({ length: USERS }, (_, i) => oneUser(i + 1)));
console.table(results);
const count = (s) => results.filter((r) => r.status === s).length;
console.log(`Chạy được (200): ${count(200)} | Bị từ chối (429): ${count(429)} | Khác: ${USERS - count(200) - count(429)}`);
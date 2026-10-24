/**
 * Kiểm chính BỘ ĐO ĐỘ HIỆU QUẢ trong frontend/public/static/js/studio-harness.py,
 * bằng CHÍNH Pyodide của trình duyệt.
 *
 * Vì sao cần một bộ kiểm riêng: 427 ca của pe-v4 và 406 đoạn của pe-da chỉ kiểm
 * ĐÚNG/SAI. Một lỗi làm số mũ luôn ra ≈ 1 sẽ đi qua tất cả chúng mà không đỏ một
 * dòng nào — và hậu quả là bộ chấm KHEN đúng cái bài học muốn chữa. Đó không
 * phải giả thuyết: bản thiết kế vòng 2 tính phí trên `sys.monitoring.CALL` một
 * mình, và đo được rằng cấu hình ấy cho vòng lặp lồng O(n²) số mũ 0,992, tức
 * "hiệu quả". Ca `O(n^2) qua toán tử ==` dưới đây canh đúng chỗ đó: gỡ nguồn
 * đếm thứ hai (bọc kiểu `Probe`) ra là nó đỏ.
 *
 *   npm i --no-save pyodide@314.0.7
 *   node scripts/check-perf.mjs [--verbose]
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { loadPyodide } from 'pyodide';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const RUNTIME =
  process.env.PYODIDE_DIR || join(ROOT, 'frontend', 'public', 'pyodide', 'v314.0.7') + '/';
const verbose = process.argv.includes('--verbose');

const CHAM = JSON.stringify([{ name: 'f([1,2,2,3])', call: 'f([1,2,2,3])', expect: '[2]' }]);
const PERF = JSON.stringify({ call: 'f(_perf_data)', base: 100 });

/** Mỗi ca: lời giải ĐÚNG (đạt ca chấm) + phán quyết hiệu quả mong đợi. */
const CA = [
  {
    ten: 'O(n^2) qua toán tử ==',
    // Ca QUAN TRỌNG NHẤT. `==` và `in` là TOÁN TỬ nên `sys.monitoring.CALL`
    // không bắn; chỉ bộ đếm bên trong `Probe.__eq__` thấy chúng. Gỡ `Probe` ra
    // thì ca này lật thành 'efficient' — đó là lỗi bộ kiểm này sinh ra để bắt.
    code:
      'def f(nums):\n' +
      '    out = []\n' +
      '    for i in range(len(nums)):\n' +
      '        for j in range(i + 1, len(nums)):\n' +
      '            if nums[i] == nums[j] and nums[i] not in out:\n' +
      '                out.append(nums[i])\n' +
      '    return sorted(out)\n',
    doi: 'slow',
  },
  {
    ten: 'O(n^2) qua nums.count()',
    // Đường còn lại: lời gọi C quét cả container. `CALL` thấy, `Probe` không.
    // Hai ca này cộng lại chứng minh CẢ HAI nguồn đếm đều cần thiết.
    code:
      'def f(nums):\n' +
      '    out = []\n' +
      '    for x in nums:\n' +
      '        if nums.count(x) > 1 and x not in out:\n' +
      '            out.append(x)\n' +
      '    return sorted(out)\n',
    doi: 'slow',
  },
  {
    ten: 'O(n) dùng set',
    code:
      'def f(nums):\n' +
      '    thay = set()\n' +
      '    trung = set()\n' +
      '    for x in nums:\n' +
      '        if x in thay:\n' +
      '            trung.add(x)\n' +
      '        thay.add(x)\n' +
      '    return sorted(trung)\n',
    doi: 'efficient',
  },
  {
    ten: 'O(n) viết dài dòng cùng bậc',
    // Cùng bậc nhưng viết rườm rà hơn: PHẢI cùng hạng với bản trên. Nếu không,
    // bộ chấm đang thưởng cho việc viết ngắn — đúng cái CodinGame bị cộng đồng
    // của chính nó phê là dạy viết code khó bảo trì.
    code:
      'def f(nums):\n' +
      '    da_gap = set()\n' +
      '    ket_qua = set()\n' +
      '    for chi_so in range(len(nums)):\n' +
      '        gia_tri = nums[chi_so]\n' +
      '        da_co = gia_tri in da_gap\n' +
      '        if da_co:\n' +
      '            ket_qua.add(gia_tri)\n' +
      '        else:\n' +
      '            da_gap.add(gia_tri)\n' +
      '    return sorted(ket_qua)\n',
    doi: 'efficient',
  },
];

/** Ca mà bộ đo PHẢI im lặng thay vì đoán bừa. */
const CA_IM_LANG = [
  {
    ten: 'lời giải bị đánh trượt → không đo',
    code: 'def f(nums):\n    return sorted(set(nums))\n',
    cham: JSON.stringify([{ name: 'sai', call: 'f([1,2,2,3])', expect: '[99]' }]),
    perf: PERF,
    doi: null,
  },
  {
    ten: 'danh sách ca RỖNG → không đo (bẫy all([]) là True)',
    code: 'def f(nums):\n    return sorted(set(nums))\n',
    cham: '[]',
    perf: PERF,
    doi: null,
  },
  {
    ten: 'bài không khai perf → không đo',
    code: 'def f(nums):\n    return sorted(set(nums))\n',
    cham: CHAM,
    perf: 'null',
    doi: null,
  },
];

const py = await loadPyodide({ indexURL: RUNTIME });
await py.runPythonAsync(
  readFileSync(join(ROOT, 'frontend', 'public', 'static', 'js', 'studio-harness.py'), 'utf8'),
);
const grade = py.globals.get('_studio_main');

const hong = [];
const chay = (code, cham, perf) => JSON.parse(grade(code, cham, '[]', '[]', perf));

for (const ca of CA) {
  const r = chay(ca.code, CHAM, PERF);
  if (!r.tests.every((t) => t.passed)) {
    hong.push(`${ca.ten}: lời giải mẫu KHÔNG đạt ca chấm — ca kiểm sai, không phải bộ đo sai`);
    continue;
  }
  const v = r.perf && r.perf.verdict;
  if (v !== ca.doi) {
    hong.push(`${ca.ten}: mong "${ca.doi}" nhận "${v}" (${JSON.stringify(r.perf)})`);
  } else if (verbose) {
    console.log(`  ✓ ${ca.ten} → ${v} ${JSON.stringify(r.perf.counts ?? '')}`);
  }
}

for (const ca of CA_IM_LANG) {
  const r = chay(ca.code, ca.cham, ca.perf);
  if (r.perf !== null) {
    hong.push(`${ca.ten}: mong perf = null, nhận ${JSON.stringify(r.perf)}`);
  } else if (verbose) {
    console.log(`  ✓ ${ca.ten} → null`);
  }
}

// TẤT ĐỊNH: cùng code, cùng dữ liệu, chạy lại phải ra ĐÚNG cùng con số. Một học
// viên nộp cùng một code hai lần mà nhận hai phán quyết khác nhau thì mất lòng
// tin vào cả hệ thống nhanh hơn bất cứ lỗi nào. Chạy lần hai cũng đồng thời
// kiểm tool id đã được nhả trong `finally` — runtime được giữ giữa các lần chạy.
const lan1 = chay(CA[0].code, CHAM, PERF).perf;
const lan2 = chay(CA[0].code, CHAM, PERF).perf;
if (JSON.stringify(lan1) !== JSON.stringify(lan2)) {
  hong.push(`không tất định: ${JSON.stringify(lan1)} rồi ${JSON.stringify(lan2)}`);
} else if (verbose) {
  console.log(`  ✓ chạy lại ra cùng số: ${JSON.stringify(lan1.counts)}`);
}

// Bài NumPy/pandas: `elem: "none"` vì np.asarray nuốt mất lớp bọc (đo được:
// dtype int32, phần tử không còn là Probe). Chỉ cần nó không nổ và không nói bừa.
const vector = chay(
  'def f(nums):\n    return sorted({x for x in nums if nums.count(x) > 1})\n',
  CHAM,
  JSON.stringify({ call: 'f(_perf_data)', base: 100, elem: 'none' }),
);
if (!vector.perf || !['slow', 'efficient', 'unknown'].includes(vector.perf.verdict)) {
  hong.push(`elem:"none" trả về phán quyết lạ: ${JSON.stringify(vector.perf)}`);
} else if (verbose) {
  console.log(`  ✓ elem:"none" → ${vector.perf.verdict}`);
}

console.log(`\n${CA.length + CA_IM_LANG.length + 2} ca · ${hong.length} hỏng`);
if (hong.length) {
  console.log('\nHỎNG:');
  for (const h of hong) console.log(`  ✗ ${h}`);
}
process.exit(hong.length ? 1 : 0);

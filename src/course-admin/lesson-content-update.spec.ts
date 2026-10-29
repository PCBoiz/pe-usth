import { readFileSync } from 'fs';
import { join } from 'path';

import {
  canonicalJson,
  parseCodesArg,
  planContentUpdates,
  selectLessons,
  ADVANCED_LESSON_MIN,
  type BundleRow,
  type DbLessonRow,
} from './lesson-content-update';

// Gói THẬT do build_advanced.py dựng — AGENTS.md: fixture không giống dữ liệu thật thì
// test vô dụng. Đọc lại mỗi ca (structuredClone) để ca nào sửa gói cũng không lây.
const BUNDLE_PATH = join(
  __dirname,
  '..',
  '..',
  'scripts',
  'pe-da',
  'out',
  'lessons.json',
);
const REAL = JSON.parse(readFileSync(BUNDLE_PATH, 'utf8')) as {
  course_id: string;
  partial?: boolean;
  lessons: BundleRow[];
};
const bundle = () => structuredClone(REAL);
const CODES = ['PY01', 'PY02', 'NP02', 'VZ01'];

describe('parseCodesArg', () => {
  it('nhận cả hai dạng, viết hoa, bỏ trùng và khoảng trắng', () => {
    expect(parseCodesArg(['--codes', 'p01, P02,,P01'])).toEqual(['P01', 'P02']);
    expect(parseCodesArg(['--apply', '--codes=VZ01'])).toEqual(['VZ01']);
  });

  it('thiếu --codes thì ném lỗi, không mặc định "mọi bài"', () => {
    expect(() => parseCodesArg(['--apply'])).toThrow(/--codes/);
    expect(() => parseCodesArg(['--codes', '--apply'])).toThrow(/--codes/);
  });
});

// Fixture đọc gói THẬT đang được seed (scripts/pe-da/out) chứ không dựng tay:
// xem bẫy "fixture test không giống dữ liệu thật thì test vô dụng" trong
// AGENTS.md. Gói cũ pe-v4 vẫn còn trong repo nhưng không còn là thứ nạp vào DB,
// nên canh nó là canh một bộ bài không ai học.
describe('selectLessons — trên gói pe-da thật', () => {
  it('chọn đúng 4 bài theo mã, đúng sort_order, không lỗi', () => {
    const { rows, errors } = selectLessons(bundle(), CODES);
    expect(errors).toEqual([]);
    expect(rows.map((r) => [r.lesson_code, r.sort_order])).toEqual([
      ['PY01', 1],
      ['PY02', 2],
      ['NP02', 20],
      ['VZ01', 74],
    ]);
  });

  it('từ chối mã không có trong gói và KHÔNG trả bài nào', () => {
    const { rows, errors } = selectLessons(bundle(), ['PY01', 'PY99']);
    expect(rows).toEqual([]);
    expect(errors.join('\n')).toMatch(/PY99/);
  });

  it('từ chối gói bị CẮT NGẮN xuống dưới sàn', () => {
    // SÀN, không phải con số chính xác. Hằng này từng là 48 rồi 172, và mỗi
    // lần khoá dài ra mà quên sửa thì `selectLessons` từ chối MỌI gói — hỏng
    // theo chiều CHẶN HẾT, đắt hơn hẳn thứ nó canh. Cắt bớt thì đỏ; thêm
    // module thì không.
    const short = bundle();
    short.lessons = short.lessons.slice(0, ADVANCED_LESSON_MIN - 1);
    const { rows, errors } = selectLessons(short, CODES);
    expect(rows).toEqual([]);
    expect(errors.join('\n')).toMatch(/cần ít nhất/);
  });

  it('CHO QUA gói DÀI HƠN sàn — thêm module không được chặn đường nạp', () => {
    const { rows, errors } = selectLessons(bundle(), CODES);
    expect(errors).toEqual([]);
    expect(rows.length).toBe(CODES.length);
  });

  it('từ chối gói có sort_order lệch dù vẫn đủ 172 bài', () => {
    const shifted = bundle();
    shifted.lessons[13].sort_order = 15;
    expect(selectLessons(shifted, CODES).rows).toEqual([]);
  });

  it('từ chối gói đánh dấu partial và gói của khoá khác', () => {
    const partial = { ...bundle(), partial: true };
    expect(selectLessons(partial, CODES).errors.join('\n')).toMatch(/THIẾU/);
    const other = { ...bundle(), course_id: 'python' };
    expect(selectLessons(other, CODES).errors.join('\n')).toMatch(/"python"/);
  });

  it('chạy validateStudioLesson trên bài được chọn', () => {
    const broken = bundle();
    const vz01 = broken.lessons.find((r) => r.lesson_code === 'VZ01')!;
    (vz01.content_json as Record<string, unknown>).title = '';
    const { rows, errors } = selectLessons(broken, CODES);
    expect(rows).toEqual([]);
    expect(errors.join('\n')).toMatch(/VZ01: .*title/);
  });

  it('từ chối bài không có play (pe-v4) lẫn step_1.read (pe-da)', () => {
    // Gói dựng dở: nạp vào là bài mở ra trắng trơn mà không lỗi nào được ném.
    const trong = bundle();
    const one = (trong.lessons[0].content_json as Record<string, unknown>)
      .step_1 as Record<string, unknown>;
    delete one.read;
    const { errors } = selectLessons(trong, ['PY01']);
    expect(errors.join(' ')).toMatch(/PY01: không có khối play/);
  });
});

describe('planContentUpdates', () => {
  const selected = () => selectLessons(bundle(), CODES).rows;
  const dbFrom = (rows: BundleRow[]): DbLessonRow[] =>
    rows.map((r) => ({
      sortOrder: r.sort_order,
      lessonCode: r.lesson_code,
      contentJson: structuredClone(r.content_json),
    }));

  it('nội dung giống hệt nhưng khoá xếp khác (jsonb) → không đổi', () => {
    const rows = selected();
    const db = dbFrom(rows).map((r) => ({
      ...r,
      // jsonb trả khoá theo thứ tự của nó, không theo file — đảo ngược để mô phỏng.
      contentJson: Object.fromEntries(
        Object.entries(r.contentJson as Record<string, unknown>).reverse(),
      ),
    }));
    const { items, errors } = planContentUpdates(rows, db);
    expect(errors).toEqual([]);
    expect(items.map((i) => i.changed)).toEqual([false, false, false, false]);
    expect(canonicalJson(db[0].contentJson)).toBe(
      canonicalJson(rows[0].content_json),
    );
  });

  it('chỉ bài có nội dung khác mới được đánh dấu đổi', () => {
    const rows = selected();
    const db = dbFrom(rows);
    (db[3].contentJson as Record<string, unknown>).title = 'VZ01 · bản cũ';
    const { items } = planContentUpdates(rows, db);
    expect(items.filter((i) => i.changed).map((i) => i.code)).toEqual(['VZ01']);
    expect(items[3].content).toBe(rows[3].content_json);
  });

  it('từ chối khi ô sort_order trong DB mang mã khác hoặc NULL', () => {
    const rows = selected();
    const db = dbFrom(rows);
    db[3].lessonCode = null;
    const { items, errors } = planContentUpdates(rows, db);
    expect(items).toEqual([]);
    expect(errors.join('\n')).toMatch(/VZ01: ô sort_order 74 .*\(NULL\)/);
  });

  it('từ chối khi DB chưa có bài — script không tạo bài', () => {
    const rows = selected();
    const { items, errors } = planContentUpdates(
      rows,
      dbFrom(rows).slice(0, 3),
    );
    expect(items).toEqual([]);
    expect(errors.join('\n')).toMatch(/VZ01: DB không có bài sort_order 74/);
  });
});

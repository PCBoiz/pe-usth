import { readFileSync } from 'fs';
import { join } from 'path';

import { validateStudioLesson } from './studio-lesson.schema';

const base = {
  title: 'B01 · Biến và kết quả',
  step_4: {
    starterCode: '# viết code\n',
    tests: [
      { name: 'mặc định', call: '_studio.run().stdout', expect: "'Python\\n'" },
    ],
  },
};

describe('validateStudioLesson — khối play (studio-lesson/v2)', () => {
  it('bài v1 không có play vẫn hợp lệ như cũ', () => {
    expect(validateStudioLesson(base)).toEqual([]);
  });

  it('chấp nhận game parsons đủ dữ liệu', () => {
    const lesson = {
      ...base,
      play: {
        level: 'B',
        games: [
          {
            id: 'parsons-0',
            type: 'parsons',
            title: 'Ghép',
            head: '',
            tail: '',
            lines: [
              { id: 'L0', text: 'name = "Python"' },
              { id: 'L1', text: 'print(name)' },
            ],
            distractors: [],
            order: ['L1', 'L0'],
          },
        ],
      },
    };
    expect(validateStudioLesson(lesson)).toEqual([]);
  });

  it('báo lỗi loại game lạ, id trùng và game chạy code khi bài không có test', () => {
    const lesson = {
      title: 'x',
      step_1: { context: { body: 'a' } },
      play: {
        games: [
          { id: 'a', type: 'boss-fight' },
          { id: 'a', type: 'debug', code: 'print(1)' },
        ],
      },
    };
    const errors = validateStudioLesson(lesson).join('\n');
    expect(errors).toContain('"boss-fight" không phải loại game hợp lệ');
    expect(errors).toContain('trùng "a"');
    expect(errors).toContain('phải có step_4.tests');
  });

  // Bài T05 THẬT (đúng gói update-lesson-content.ts nạp vào DB), không fixture
  // tay — bẫy số 1 của AGENTS.md. Thiếu 'soQuy' trong PLAY_GAME_TYPES thì ca này
  // đỏ, và đó cũng là lý do update-lesson-content.ts sẽ từ chối nạp T05.
  const t05 = JSON.parse(
    readFileSync(
      join(__dirname, '../../scripts/pe-v4/out-advanced/lessons/012-T05.json'),
      'utf8',
    ),
  ) as { content_json: Record<string, unknown> & { play: { games: Game[] } } };
  type Game = Record<string, unknown> & { type: string };
  const soQuy = (): Game => {
    const g = t05.content_json.play.games.find((x) => x.type === 'soQuy');
    if (!g)
      throw new Error('012-T05.json không còn game soQuy — dựng lại pe-v4?');
    return g;
  };

  it('chấp nhận bài T05 thật có mini-game soQuy', () => {
    expect(soQuy().type).toBe('soQuy');
    expect(validateStudioLesson(t05.content_json)).toEqual([]);
  });

  it('soQuy thiếu người hoặc sai tên hàm thì báo lỗi', () => {
    const lesson = (g: Game) => ({
      ...t05.content_json,
      play: { ...t05.content_json.play, games: [g] },
    });
    const motNguoi = { ...soQuy(), nguoi: [{ ten: 'A', soTien: 50 }] };
    expect(validateStudioLesson(lesson(motNguoi)).join()).toContain(
      'đúng 2 người',
    );
    const hamSai = { ...soQuy(), ham: 'nap tien' };
    expect(validateStudioLesson(lesson(hamSai)).join()).toContain(
      'tên hàm Python',
    );
  });

  it('match phải có rightOrder khớp số cặp', () => {
    const lesson = {
      ...base,
      play: {
        games: [
          {
            id: 'm',
            type: 'match',
            pairs: [
              { left: 'a', right: '1' },
              { left: 'b', right: '2' },
            ],
            rightOrder: [0],
          },
        ],
      },
    };
    expect(validateStudioLesson(lesson).join()).toContain('rightOrder');
  });
});

// Hình dạng thật lấy từ scripts/pe-v4/out/lessons/014-G01.json (xem AGENTS.md:
// fixture không giống dữ liệu thật thì test không chứng minh được gì).
describe('validateStudioLesson — lý thuyết + hình (step_1.theory / step_1.figure)', () => {
  const figure = {
    src: '/static/anim/G01-window-anatomy.svg',
    caption: 'Giải phẫu cửa sổ Tk: title, geometry và cửa sổ phụ Toplevel',
    alt: 'Cửa sổ chính Tk với thanh tiêu đề, kích thước 800x600 và vùng nội dung rỗng',
  };
  const withTheory = {
    ...base,
    step_1: {
      theory: [
        { title: 'Định nghĩa: GUI và CLI', body: 'CLI nhận lệnh gõ trong terminal…' },
        {
          title: 'Tkinter gồm bốn phần',
          bullets: ['Window: tk.Tk() là cửa sổ chính', 'Widgets: Frame, Label, Button…'],
        },
        { title: 'Đọc sơ đồ', body: 'Thanh tiêu đề mang chuỗi của title()…', figure },
      ],
      figure: { ...figure, name: 'G01-window-anatomy' },
    },
  };

  it('bài mang theory + figure hợp lệ', () => {
    expect(validateStudioLesson(withTheory)).toEqual([]);
  });

  it('bài không khai theory/figure vẫn hợp lệ như cũ (M4–M8, khoá cũ)', () => {
    expect(validateStudioLesson({ ...base, step_1: { context: { body: 'a' } } })).toEqual([]);
  });

  it('bắt khối rỗng, thiếu tiêu đề và hình thiếu alt/src ngoài miền', () => {
    const errors = validateStudioLesson({
      ...base,
      step_1: {
        theory: [
          { title: 'Chỉ có tiêu đề' },
          { body: 'Thiếu title.' },
          { title: 'Hình hỏng', body: 'x', figure: { src: 'https://cdn.example.com/a.svg', caption: 'c' } },
        ],
        figure: { src: '/static/anim/x.png', caption: 'c', alt: 'a' },
      },
    }).join('\n');
    expect(errors).toContain('step_1.theory[0]: phải có body hoặc bullets');
    expect(errors).toContain('step_1.theory[1].title: thiếu tiêu đề khối.');
    expect(errors).toContain('step_1.theory[2].figure.src');
    expect(errors).toContain('step_1.theory[2].figure.alt');
    expect(errors).toContain('step_1.figure.src');
  });

  it('theory sai kiểu bị từ chối', () => {
    expect(validateStudioLesson({ ...base, step_1: { theory: 'ba khối' } }).join()).toContain(
      'step_1.theory: phải là mảng',
    );
    expect(validateStudioLesson({ ...base, step_1: { theory: [] } }).join()).toContain(
      'step_1.theory: mảng rỗng',
    );
    expect(validateStudioLesson({ ...base, step_1: { figure: 'P01' } }).join()).toContain(
      'step_1.figure: phải là object',
    );
  });
});

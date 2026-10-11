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

/**
 * Bộ nhập tài liệu (PDF/Markdown → bài học) — `extractText` + `parseTemplate`.
 *
 * VÌ SAO BỘ NÀY TỒN TẠI: `lesson-import.service.ts` có hơn 600 dòng và ĐÚNG 0
 * ca test, trong khi không trang nào của frontend gọi `/admin/*`. Tức nó chưa
 * bao giờ được chứng minh là chạy đúng — đúng hình dạng lỗi mà AGENTS.md ghi
 * sáu lần (tracer không bài nào tới, nút "Try it Yourself" không màn nào
 * mount, kho quiz rỗng, 13 màn tối).
 *
 * FIXTURE LÀ FILE THẬT, không phải chuỗi dựng trong test. `bai-day-du.md` là
 * bản sao nội dung của `samples/lesson-fstring.md` (bài mẫu đã có trong repo),
 * và ca PDF đọc chính `samples/lesson-fstring.pdf`. AGENTS.md: "Fixture test
 * không giống dữ liệu thật thì test vô dụng" — `quizzes.service.spec.ts` từng
 * khẳng định "không bao giờ lộ đáp án" bằng fixture `options: ['a','b']`
 * trong khi dữ liệu thật là mảng object mang cờ `correct`.
 *
 * HỢP ĐỒNG mà bộ này canh: `errors` rỗng ⇒ bài ĐÃ qua `validateStudioLesson`,
 * cửa duy nhất vào DB. Và file lệch mẫu phải ra LỖI NÓI RÕ THIẾU GÌ, không ra
 * một bài rỗng.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import {
  bocRacPdf,
  dungVanBanTuToaDo,
  LessonImportService,
  READ_BLOCK_TYPES_EMITTED,
  rutLeKhoiMa,
  type ImportedReadBlock,
  type MauChu,
} from './lesson-import.service';
import {
  planLessonInserts,
  type ExistingLesson,
  type InsertRow,
} from './lesson-insert';
import {
  validateStudioLesson,
  type StudioLesson,
} from './studio-lesson.schema';

const FIXTURES = join(__dirname, '__fixtures__');

/**
 * VÌ SAO MỌI THỨ Ở ĐÂY LÀ BẢN CHỤP chứ không gọi `extractText` trên file .pdf
 * ngay trong test: `pdfjs-dist` tự `import()` động để dựng "fake worker", nên
 * trong vm của Jest nó ném `ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG` —
 * nhánh ĐỌC file PDF không chạy được dưới `npx jest` mà không đổi lệnh chạy
 * của cả repo. Đã thử: cả `await import()` lẫn `require()` đều chết ở cùng một
 * chỗ.
 *
 * Nên phân vai: Jest chấm phần SAU khi đã có số liệu — tức TOÀN BỘ phần có thể
 * sai — còn nhánh đọc file PDF chạy thật bằng
 * `npx ts-node scripts/import-lesson.ts --file=samples/lesson-fstring.pdf
 * --offline` (node thật, không có hạn chế này).
 *
 * BA bản chụp, cả ba sinh từ CHÍNH `samples/lesson-fstring.pdf`, không gõ tay
 * (`--chup=src/course-admin/__fixtures__`, xem `scripts/import-lesson.ts`).
 */

/**
 * Toạ độ THẬT của từng mẩu chữ: đầu vào của `dungVanBanTuToaDo()`.
 * Dạng nén `[x, y, cao, rong, chỉ-số-font, chữ]` để fixture 1294 mẩu chữ còn
 * đọc được bằng mắt.
 */
const MAU_CHU: MauChu[][] = (() => {
  const goi = JSON.parse(
    readFileSync(join(FIXTURES, 'pdf-mau-chu.json'), 'utf8'),
  ) as {
    fonts: string[];
    trangs: [number, number, number, number, number, string][][];
  };
  return goi.trangs.map((t) =>
    t.map(([x, y, cao, rong, f, chu]) => ({
      x,
      y,
      cao,
      rong,
      font: goi.fonts[f],
      chu,
    })),
  );
})();

/** Văn bản dựng lại TỪ TOẠ ĐỘ — đường đang dùng. CÓ thụt lề. */
const PDF_THO = readFileSync(join(FIXTURES, 'pdf-boc-ra.txt'), 'utf8');

/**
 * Văn bản `pdf-parse@2.4.5` bóc PHẲNG ra từ cùng file đó (byte nguyên bản, kể
 * cả hai dòng phân trang). Đây là đường DỰ PHÒNG — chỉ chạy khi không đo được
 * lưới chữ đều bề — nên nó vẫn phải được canh: mất thụt lề, và còn rác phân
 * trang rơi vào giữa khối mã.
 */
const PDF_PHANG = readFileSync(join(FIXTURES, 'pdf-boc-phang.txt'), 'utf8');

/**
 * `samples/lesson-fstring.md` — bản .md mà file PDF mẫu được XUẤT RA TỪ ĐÓ.
 *
 * Phải là file này, KHÔNG phải `__fixtures__/bai-day-du.md`: bản fixture lược
 * đi một dòng gợi ý ("Lời giải mẫu ::"), nên so bài-từ-PDF với nó là so với
 * một nội dung khác và sẽ lệch ở một chỗ không liên quan gì tới PDF.
 */
const MD_MAU = readFileSync(
  join(__dirname, '..', '..', 'samples', 'lesson-fstring.md'),
  'utf8',
);

/** Mốc thời gian CỐ ĐỊNH: dấu vân tay nội dung phải lặp lại được. */
const MOC = '2026-10-29T00:00:00.000Z';

function doc(name: string): string {
  return readFileSync(join(FIXTURES, name), 'utf8');
}

const svc = new LessonImportService();

function parse(name: string) {
  return svc.parseTemplate(doc(name), name, MOC);
}

/**
 * Hình dạng mà bộ parse phát ra, khai bằng TÊN KHOÁ THẬT thay vì
 * `Record<string, any>`.
 *
 * Vì sao không dùng `any`: AGENTS.md đã ghi bài học này — `any` ở spec làm
 * test NÓI DỐI. Gõ `solution_code` thay cho `solutionCode` vẫn biên dịch,
 * `toBeUndefined()` vẫn ĐẠT, và lỗ hổng vẫn còn nguyên. Ở đây đúng nguy cơ
 * đó: cả bộ này tồn tại để chứng minh parse ra ĐÚNG TÊN KHOÁ mà frontend đọc.
 */
type LuaChon = { title?: string; detail?: string; correct?: boolean };
type Buoc1 = {
  read?: ImportedReadBlock[][];
  context?: { title?: string; body?: string };
  code?: { filename?: string; source?: string };
  predict?: { question?: string; options?: LuaChon[] };
  explain?: { n?: number; title?: string; body?: string }[];
  misconception?: { title?: string; body?: string };
};
type Buoc2 = {
  mcq?: {
    question?: string;
    correct?: number;
    options?: { text?: string; detail?: string; correct?: boolean }[];
  }[];
  classify?: {
    bins?: { key?: string }[];
    tokens?: { label?: string; bin?: string }[];
  };
  selfExplain?: { prompt?: string; rubric?: unknown[] };
};
type Buoc3 = {
  scaffold?: {
    template?: string;
    slots?: { n?: number; placeholder?: string; answer?: string }[];
    bank?: { label?: string; slot?: number; trap?: string }[];
  };
  counter?: { question?: string; options?: string[]; correct?: string };
};
type Buoc4 = {
  starterCode?: string;
  solutionCode?: string;
  tests?: { name?: string; call?: string; expect?: string }[];
  hints?: unknown[];
  forbid?: string[];
};

const b1 = (l: StudioLesson | null): Buoc1 => l?.step_1 ?? {};
const b2 = (l: StudioLesson | null): Buoc2 => (l?.step_2 ?? {}) as Buoc2;
const b3 = (l: StudioLesson | null): Buoc3 => l?.step_3 ?? {};
const b4 = (l: StudioLesson | null): Buoc4 => l?.step_4 ?? {};

// ───────────────────────────── extractText ──────────────────────────────────

describe('extractText', () => {
  it('đọc .md và .txt nguyên văn UTF-8', async () => {
    const buffer = Buffer.from('# Bài có dấu tiếng Việt\n', 'utf8');
    for (const name of ['a.md', 'a.markdown', 'a.txt']) {
      await expect(
        svc.extractText({ originalname: name, buffer }),
      ).resolves.toContain('# Bài có dấu tiếng Việt');
    }
  });

  it('TỪ CHỐI phần mở rộng không nhận', async () => {
    await expect(
      svc.extractText({
        originalname: 'bai.docx',
        buffer: Buffer.from('x'),
      }),
    ).rejects.toThrow(/\.md, \.txt hoặc \.pdf/);
  });

  it('văn bản PDF đã bóc giữ nguyên heading — đó là phần PDF còn dùng được', () => {
    expect(PDF_THO).toContain('# Định dạng chuỗi với f-string');
    expect(PDF_THO).toContain('## S1 Ngữ cảnh');
    expect(PDF_THO).toContain('### Test');
    // Cả bảng Test cũng sống sót nguyên dòng.
    expect(PDF_THO).toContain(
      '| `format_scores([])` | `[]` | Danh sách rỗng |',
    );
  });

  it('dọn rác trang: "-- 1 of 2 --" rơi vào GIỮA một khối mã chưa đóng', () => {
    // Trên bản bóc PHẲNG (đường dự phòng). Đường theo toạ độ không đi qua
    // `pageJoiner` của pdf-parse nên không sinh rác này — ca dưới khoá chuyện đó.
    const dong = PDF_PHANG.split('\n');
    const o = dong.findIndex((l) => /^--\s*\d+ of \d+\s*--$/.test(l.trim()));
    expect(o).toBeGreaterThan(0);
    // Số fence đứng trước nó là SỐ LẺ ⇒ lúc đó đang ở trong một khối ```python.
    // Không dọn thì chuỗi phân trang thành một dòng mã của bài học.
    const fenceTruoc = dong
      .slice(0, o)
      .filter((l) => l.trim().startsWith('```')).length;
    expect(fenceTruoc % 2).toBe(1);

    expect(bocRacPdf(PDF_PHANG)).not.toMatch(/--\s*\d+ of \d+\s*--/);
  });

  it('đường theo toạ độ KHÔNG sinh rác phân trang, nhưng vẫn đi qua bocRacPdf', () => {
    // Trang 1 của file mẫu kết thúc GIỮA một khối ```python. Bản phẳng nhét
    // "-- 1 of 2 --" vào đúng đó; bản theo toạ độ nối thẳng hai trang.
    expect(PDF_PHANG).toMatch(/--\s*\d+ of \d+\s*--/);
    expect(PDF_THO).not.toMatch(/--\s*\d+ of \d+\s*--/);
    // Và không chèn dòng trống nào ở ranh giới trang: chèn vào là cắt đôi khối
    // mã. `def format_scores` là dòng ĐẦU của trang 2, ngay sau ```python.
    //
    // ĐÃ ABLATE, và kết quả nói ra một chuyện đáng ghi: gỡ điều kiện
    // `truoc.trang === d.trang` thì KHÔNG ca nào đỏ. Vì y được tính lại theo
    // từng trang, dòng cuối trang 1 (y≈40) thấp hơn dòng đầu trang 2 (y≈802)
    // nên hiệu số ra ÂM và `Math.max(trong, 0)` đã nuốt nó. Điều kiện kia là
    // phòng xa (trang xoay ngang, khổ giấy lẫn lộn), không phải thứ đang giữ
    // khối mã liền — ca này canh KẾT QUẢ, nên nó vẫn đỏ nếu phép dựng dòng
    // trống hỏng theo đường khác.
    expect(dungVanBanTuToaDo(MAU_CHU).text).toContain(
      '```python\ndef format_scores(rows):',
    );
    expect(PDF_THO).toContain('```python\ndef format_scores(rows):');
  });

  it('bocRacPdf chỉ bỏ dòng phân trang, không bỏ dòng mã có dấu gạch', () => {
    const vao = ['x = 1  # -- chu thich --', '-- 2 of 7 --', 'y = x - 1'];
    expect(bocRacPdf(vao.join('\n')).split('\n')).toEqual([
      'x = 1  # -- chu thich --',
      'y = x - 1',
    ]);
  });
});

// ───────────────────────── parseTemplate: file ĐÚNG ──────────────────────────

describe('parseTemplate — file đúng mẫu', () => {
  it('dựng đủ bốn bước từ bài mẫu THẬT của repo', () => {
    const { lesson, errors, warnings } = parse('bai-day-du.md');
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
    expect(lesson).not.toBeNull();

    const l = lesson!;
    expect(l.schema).toBe('studio-lesson/v1');
    expect(l.title).toBe('Định dạng chuỗi với f-string');
    expect(l.source).toEqual({
      kind: 'markdown',
      filename: 'bai-day-du.md',
      parser: 'template',
      importedAt: MOC,
    });

    // S1: ngữ cảnh + code + dự đoán + giải thích + ngộ nhận
    const one = b1(l);
    expect(one.context?.body).toContain('CLB lập trình');
    expect(one.code?.source).toContain('print(f"Điểm của {name}');
    expect(one.predict?.question).toContain('khác nhau ở điểm nào?');
    expect(one.predict?.options).toHaveLength(4);
    expect(one.predict?.options?.map((o) => o.correct)).toEqual([
      false,
      true,
      false,
      false,
    ]);
    // `— mô tả` phải thành `detail`, không dính vào tiêu đề lựa chọn.
    expect(one.predict?.options?.[1].title).toBe(
      'Dòng f-string làm tròn 2 chữ số',
    );
    expect(one.predict?.options?.[1].detail).toContain('Hậu tố :.2f');
    expect(one.explain).toHaveLength(3);
    expect(one.explain?.[0]).toMatchObject({ n: 1, title: 'Dòng 3' });
    expect(one.misconception?.title).toContain('cách viết ngắn');
    expect(one.misconception?.body).toContain('format spec');

    // S2: trắc nghiệm phải nằm ở step_2.mcq — QuizzesService đọc đúng đường đó.
    const two = b2(l);
    expect(two.mcq).toHaveLength(1);
    expect(two.mcq?.[0].correct).toBe(1);
    expect(two.mcq?.[0].options?.[1]).toMatchObject({
      text: '"3.142"',
      correct: true,
    });
    expect(two.classify?.bins?.map((b) => b.key)).toEqual(['fstring', 'older']);
    expect(two.classify?.tokens).toHaveLength(6);
    expect(two.classify?.tokens?.[0]).toEqual({
      label: 'f"{x}"',
      bin: 'fstring',
    });
    expect(two.selfExplain?.rubric).toHaveLength(2);

    // S3: khung lắp ghép + bẫy
    const three = b3(l);
    expect(three.scaffold?.template).toContain('{{slot1}}');
    expect(three.scaffold?.slots).toEqual([
      {
        n: 1,
        placeholder: '[Slot 1]',
        answer: 'return f"{name}: {score:.2f} diem"',
      },
    ]);
    expect(three.scaffold?.bank).toHaveLength(3);
    expect(three.scaffold?.bank?.[1].trap).toBe('Bẫy cộng chuỗi');
    expect(three.counter?.correct).toBe('Mai: 8.46 diem');
    expect(three.counter?.options).toHaveLength(3);

    // S4: ca chấm theo hợp đồng BIỂU THỨC (call/expect)
    const four = b4(l);
    expect(four.starterCode).toContain('result = []');
    expect(four.solutionCode).toContain('for name, score in rows');
    expect(four.tests).toHaveLength(3);
    expect(four.tests?.[0]).toEqual({
      name: 'Làm tròn 2 chữ số',
      call: 'format_scores([("Mai", 8.4567)])',
      expect: '["Mai: 8.46"]',
    });
    expect(four.hints).toHaveLength(2);
    expect(four.forbid).toEqual(['"%', '.format(']);
  });

  it('kết quả parse QUA ĐƯỢC validateStudioLesson — cửa duy nhất vào DB', () => {
    for (const name of ['bai-day-du.md', 'bai-co-man-doc.md']) {
      const { lesson, errors } = parse(name);
      expect(errors).toEqual([]);
      expect(validateStudioLesson(lesson)).toEqual([]);
    }
  });

  it('dựng màn đọc `step_1.read` thành mảng các MÀN, mỗi màn một mảng khối', () => {
    const { lesson, errors, warnings } = parse('bai-co-man-doc.md');
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);

    const read = b1(lesson).read!;
    // Ba `###` dưới `## Đọc` = ba màn. Hợp đồng là ReadBlock[][]; một mảng
    // phẳng thì ReadScreen nhận undefined ở mọi lát và bài mở ra trắng.
    expect(read).toHaveLength(3);
    expect(Array.isArray(read[0])).toBe(true);

    const man1 = read[0];
    expect(man1[0]).toMatchObject({ type: 'paragraph' });
    expect(man1[1]).toMatchObject({ type: 'code' });
    // ```output đứng ngay sau khối code trở thành `expected` CỦA KHỐI ĐÓ,
    // không thành một khối riêng — màn đọc hiện nó dưới nhãn "Kết quả:".
    expect((man1[1] as { expected?: string }).expected).toContain(
      "['Mai', '8.4']",
    );
    expect(man1).toHaveLength(3);

    // Bảng Markdown → khối `table`, bỏ dòng kẻ ngang.
    const bang = read[1].find((b) => b.type === 'table');
    expect(bang).toMatchObject({
      type: 'table',
      headers: ['Cách đọc', 'Trả về mỗi dòng', 'Dùng khi'],
    });
    expect((bang as { rows: string[][] }).rows).toHaveLength(2);

    // ```bash → `terminal`, KHÔNG phải `code`: người học copy lệnh shell vào ô
    // soạn mã Python rồi nhận SyntaxError mà không hiểu vì sao.
    const term = read[2].find((b) => b.type === 'terminal');
    expect(term).toMatchObject({ type: 'terminal', code: 'head -3 diem.csv' });
    expect((term as { expected?: string }).expected).toContain('ten,diem');
  });

  it('CHỈ phát ra loại khối mà màn đọc dựng được', () => {
    // `validateStudioLesson` KHÔNG kiểm loại khối của màn đọc (xem ca "KHIẾM
    // KHUYẾT ĐÃ BIẾT" trong lesson-insert.spec.ts): một loại lạ đi lọt vào DB
    // rồi BIẾN MẤT IM LẶNG ở nhánh `default` của ReadScreen. Hàng rào duy nhất
    // là việc bộ parse không biết viết ra chuỗi nào khác — ca này khoá nó.
    const { lesson } = parse('bai-co-man-doc.md');
    const read = b1(lesson).read!;
    const loai = new Set(read.flat().map((b) => b.type));
    for (const t of loai) {
      expect(READ_BLOCK_TYPES_EMITTED).toContain(t);
    }
    expect(loai.size).toBeGreaterThanOrEqual(3);
  });

  it('cùng một file + cùng importedAt ⇒ dấu vân tay KHÔNG đổi', () => {
    // `new Date()` trong parse làm bản XEM TRƯỚC và bản GHI THẬT của một file
    // khác sha256, và nhập lại một file KHÔNG ĐỔI vẫn hiện là "ĐỔI".
    const a = parse('bai-day-du.md').lesson;
    const b = parse('bai-day-du.md').lesson;
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const c = svc.parseTemplate(
      doc('bai-day-du.md'),
      'bai-day-du.md',
      MOC + '1',
    );
    expect(JSON.stringify(c.lesson)).not.toBe(JSON.stringify(a));
  });

  it('CẢNH BÁO heading `###` lạ thay vì bỏ im lặng', () => {
    const { lesson, errors, warnings } = parse('canh-bao-heading-la.md');
    expect(errors).toEqual([]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('Mở rộng cho người đã biết');
    expect(warnings[0]).toContain('KHÔNG được đưa vào bài');
    // Phần hiểu được vẫn vào bài — cảnh báo không phải lý do từ chối.
    expect(b1(lesson).misconception?.body).toContain('-7 % 3');
  });
});

// ───────────────────────── parseTemplate: file SAI ──────────────────────────

describe('parseTemplate — file sai mẫu phải NÓI RÕ thiếu gì', () => {
  it('tài liệu thường (không có S1..S4 hay Đọc): từ chối và chỉ sang tài liệu mẫu', () => {
    const { lesson, errors } = parse('loi-khong-theo-mau.md');
    expect(lesson).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('## S1');
    expect(errors[0]).toContain('LESSON-IMPORT-FORMAT.md');
  });

  it('thiếu `# tiêu đề`: báo ĐÚNG chỗ đó, không trả về bài không tên', () => {
    const { lesson, errors } = parse('loi-thieu-tieu-de.md');
    expect(errors.join(' | ')).toContain('Thiếu dòng tiêu đề');
    expect(errors.join(' | ')).toContain('LESSON-IMPORT-FORMAT.md');
    // Bản nháp vẫn được trả ra để người soạn thấy phần nào đã nhận diện được,
    // nhưng nó KHÔNG hợp lệ — hai chuyện khác nhau.
    expect(lesson!.title).toBeUndefined();
    expect(validateStudioLesson(lesson).length).toBeGreaterThan(0);
  });

  it('trắc nghiệm không có `[x]`, và trắc nghiệm có HAI `[x]`', () => {
    const { errors } = parse('loi-trac-nghiem-khong-dap-an.md');
    const all = errors.join(' | ');
    expect(all).toContain('chưa đánh dấu đáp án đúng');
    // Hai dấu [x] là lỗi mà validateStudioLesson KHÔNG bắt được: `some(correct)`
    // đúng với cả hai, còn `mcq.correct` chỉ trỏ vào cái ĐẦU TIÊN — học viên
    // chọn cái thứ hai vẫn bị chấm sai.
    expect(all).toMatch(/có 2 dấu `\[x\]`/);
  });

  it('khung lắp ghép có {{slot2}} mà thiếu dòng `- slot2 = …`', () => {
    const { errors } = parse('loi-slot-thieu-dap-an.md');
    expect(errors.join(' | ')).toContain('{{slot2}}');
    expect(errors.join(' | ')).toContain('- slot2 =');
  });

  it('bảng Test chỉ có dòng tiêu đề: KHÔNG được coi là bài đủ', () => {
    const { errors } = parse('loi-bang-test-rong.md');
    const all = errors.join(' | ');
    expect(all).toContain('không có dòng ca chấm nào');
    // Và cửa vào DB cũng đỏ — có code khởi tạo thì phải có phần Test.
    expect(all).toContain('step_4.tests');
  });

  it('mã Python mất thụt lề (dấu hiệu văn bản bóc từ PDF)', () => {
    const { errors } = parse('loi-code-mat-thut-le.md');
    const matThutLe = errors.filter((e) => e.includes('MẤT THỤT LỀ'));
    // Hai khối: code khởi tạo và lời giải.
    expect(matThutLe).toHaveLength(2);
    expect(matThutLe[0]).toContain('code khởi tạo');
    expect(matThutLe[1]).toContain('lời giải');
    expect(matThutLe[0]).toContain('PDF');
  });

  it('heading `## S5` không im lặng biến mất', () => {
    const { errors } = svc.parseTemplate(
      '# Bài\n\n## S1 Ngữ cảnh\n\nMột đoạn.\n\n## S5 Phần thêm\n\nNội dung.\n',
      'x.md',
      MOC,
    );
    expect(errors.join(' | ')).toContain('chỉ có S1, S2, S3, S4');
  });

  it('`### Bộ nhớ` có JSON hỏng: báo lỗi, KHÔNG bỏ qua màn đó', () => {
    const text = [
      '# Bài',
      '',
      '## S1 Ngữ cảnh',
      '',
      'Một đoạn ngữ cảnh.',
      '',
      '### Bộ nhớ',
      '',
      '```json',
      '{ "stack": [ }',
      '```',
      '',
    ].join('\n');
    const { errors } = svc.parseTemplate(text, 'x.md', MOC);
    expect(errors.join(' | ')).toContain('Bộ nhớ: JSON không đọc được');
  });
});

// ─────────────── Bài nhập vào có đi được vào DB thật không ──────────────────

describe('đường nạp — planLessonInserts nhận bài nhập vào không?', () => {
  const DB: ExistingLesson[] = [{ sortOrder: 1, lessonCode: 'PY01' }];

  const hang = (name: string, code: string, sortOrder: number): InsertRow => ({
    lesson_code: code,
    sort_order: sortOrder,
    content_json: parse(name).lesson,
  });

  it('bài có `## Đọc` đi qua được CẢ SÁU luật của đường tạo bài', () => {
    const { plan, errors } = planLessonInserts(
      [hang('bai-co-man-doc.md', 'IM01', 2)],
      DB,
    );
    expect(errors).toEqual([]);
    expect(plan).toHaveLength(1);
  });

  it('bài CHỈ có S1..S4 cũng qua được luật 6 — nó dựng ra màn, dù không có `read`', () => {
    // Luật 6 TỪNG đòi `step_1.read` hoặc `play` và vì thế từ chối mọi bài nhập
    // theo mẫu `## S1..## S4`; commit e1e94a8 ("luật 6 hỏi sai câu") sửa nó
    // thành hỏi "có dựng ra màn nào không". Ca này đi theo, và nó là chỗ nói ra
    // rằng người soạn tài liệu KHÔNG còn bị bắt thêm một phần `## Đọc` chỉ để
    // qua cửa INSERT.
    const { plan, errors } = planLessonInserts(
      [hang('bai-day-du.md', 'IM02', 2)],
      DB,
    );
    expect(errors).toEqual([]);
    expect(plan).toHaveLength(1);
  });
});

// ───────────── Dựng lại thụt lề từ TOẠ ĐỘ chữ (phần có thể sai) ──────────────

/** Dựng một mẩu chữ giả, chỉ khai những trường ca test đang nói về. */
function mau(
  p: Partial<MauChu> & { x: number; y: number; chu: string },
): MauChu {
  return {
    cao: 8.25,
    rong: 4.95 * [...p.chu].length,
    font: 'mono',
    ...p,
  };
}

/** Một trang chữ đều bề: mỗi dòng là `[cột, nội dung]`. */
function trangDeuBe(dong: [number, string][], be = 4.95): MauChu[] {
  return dong.map(([cot, chu], i) =>
    mau({ x: 40 + cot * be, y: 800 - i * 9, chu, rong: be * [...chu].length }),
  );
}

describe('dungVanBanTuToaDo — khôi phục thụt lề từ toạ độ', () => {
  it('toạ độ THẬT của samples/lesson-fstring.pdf đo ra một lưới chữ ĐỀU BỀ', () => {
    const ra = dungVanBanTuToaDo(MAU_CHU);
    expect(ra.deuBe).toBe(true);
    // Số đo phải NÓI RA trong log, không chỉ là một cờ boolean: ngày một file
    // bị từ chối, đây là câu duy nhất nói vì sao.
    expect(ra.doDuoc).toContain('ĐỀU BỀ');
    expect(ra.doDuoc).toMatch(/100\.0% quanh 4\.95\d? pt/);
  });

  it('thân hàm Python về đúng cột 4, KHÔNG về cột 0', () => {
    const { text } = dungVanBanTuToaDo(MAU_CHU);
    // Ba chỗ mà bản bóc phẳng làm hỏng: khung lắp ghép, code khởi tạo, lời giải.
    expect(text).toContain('def report_line(name, score):\n    {{slot1}}');
    expect(text).toContain('\n    result = []\n');
    expect(text).toContain(
      '\n    return [f"{name}: {score:.2f}" for name, score in rows]\n',
    );
    // Và bản phẳng thì KHÔNG — đây là lý do cả bản sửa này tồn tại.
    expect(PDF_PHANG).toContain('\nresult = []\n');
  });

  it('dựng lại được 110/114 dòng của bản .md; 4 dòng lệch đều DÀI hơn bề rộng trang', () => {
    const md = MD_MAU.replace(/\r\n?/g, '\n').split('\n');
    const pdf = new Set(
      rutLeKhoiMa(dungVanBanTuToaDo(MAU_CHU).text).split('\n'),
    );
    const thieu = md.filter((l) => l !== '' && !pdf.has(l));
    // Phép so mạnh nhất có sẵn: cùng một nội dung, hai định dạng. Chỗ không
    // giống được là chỗ nguồn có dòng DÀI HƠN BỀ RỘNG TRANG (~102 ký tự ở cỡ
    // chữ này) — toạ độ không chữa được, nên nó ở lại dưới dạng CẢNH BÁO.
    expect(thieu).toHaveLength(4);
    for (const l of thieu) expect(l.length).toBeGreaterThan(100);
  });

  it('dựng lại DÒNG TRỐNG từ khoảng cách dòng — markdown cần nó để tách đoạn', () => {
    const { text } = dungVanBanTuToaDo(MAU_CHU);
    expect(text).toContain('```\n\n### Lời giải\n\n```python');
    // Bản phẳng gần như bỏ sạch dòng trống (5 dòng, đều quanh chỗ phân trang)
    // trong khi bản theo toạ độ dựng lại đủ 38 — đúng số dòng trống của .md.
    expect(PDF_THO.split('\n').filter((l) => l === '')).toHaveLength(38);
    expect(PDF_PHANG.split('\n').filter((l) => l === '')).toHaveLength(5);
  });

  it('font TỈ LỆ: nói KHÔNG đo được, thay vì đoán một thụt lề', () => {
    // Bề rộng mỗi ký tự nhảy loạn (0,5 → 9,5 pt) — đúng tính chất của Arial /
    // Times. Nếu hàm này vẫn trả `deuBe: true` thì người gọi sẽ tin vào một
    // thụt lề bịa ra, và `IndentationError` ở tay học viên không ai truy được
    // về PDF nữa.
    const loan: MauChu[] = [];
    for (let i = 0; i < 60; i++) {
      loan.push(
        mau({
          x: 40 + i * 7,
          y: 800 - (i % 10) * 9,
          chu: 'ab',
          rong: 1 + (i % 19),
          font: 'ti-le',
        }),
      );
    }
    const ra = dungVanBanTuToaDo([loan]);
    expect(ra.deuBe).toBe(false);
    expect(ra.doDuoc).toContain('tỉ lệ');
  });

  it('ít phép đo quá thì KHÔNG kết luận — ba mẩu chữ cùng bề rộng là tình cờ', () => {
    const ra = dungVanBanTuToaDo([
      trangDeuBe([
        [0, 'def f():'],
        [4, 'return 1'],
      ]),
    ]);
    expect(ra.deuBe).toBe(false);
    expect(ra.doDuoc).toContain('quá ít để kết luận');
  });

  it('lề trái lấy x NHỎ NHẤT, không phải x phổ biến nhất', () => {
    // Khối mã nào cũng có nhiều dòng THÂN hơn dòng đầu. Lấy giá trị phổ biến
    // nhất là lấy nhầm mức thụt của thân hàm làm cột 0 — cả khối lệch, mà lệch
    // ĐỀU nên `kiemThutLe()` không thấy gì sai.
    const dong: [number, string][] = [[0, 'def f(xs):']];
    for (let i = 0; i < 30; i++) dong.push([4, `xs.append(${i})`]);
    const { text, deuBe } = dungVanBanTuToaDo([trangDeuBe(dong)]);
    expect(deuBe).toBe(true);
    expect(text.split('\n')[0]).toBe('def f(xs):');
    expect(text.split('\n')[1]).toBe('    xs.append(0)');
  });

  it('bản chụp `pdf-boc-ra.txt` ĐÚNG là thứ hàm này dựng ra hôm nay', () => {
    // Cổng chống TRÔI LỆCH. Ba ca dưới đây và cả phép so .md/.pdf đều đọc bản
    // chụp; sửa phép dựng mà quên chụp lại thì chúng vẫn xanh trên dữ liệu cũ
    // — đúng họ lỗi "sơ đồ đã trôi khỏi bài" mà AGENTS.md ghi. Ca này buộc hai
    // thứ dính vào nhau. Chụp lại:
    //   npx ts-node scripts/import-lesson.ts --file=samples/lesson-fstring.pdf
    //     --offline --chup=src/course-admin/__fixtures__
    expect(rutLeKhoiMa(dungVanBanTuToaDo(MAU_CHU).text)).toBe(
      PDF_THO.replace(/\r\n?/g, '\n'),
    );
  });

  it('không có mẩu chữ nào (PDF scan): nói ra, không ném', () => {
    const ra = dungVanBanTuToaDo([]);
    expect(ra).toEqual({
      text: '',
      deuBe: false,
      doDuoc: 'không có mẩu chữ nào',
    });
  });
});

describe('rutLeKhoiMa — khối mã thụt ĐỀU là lỗi mà kiemThutLe không thấy', () => {
  it('rút lề chung của khối ```…``` về 0', () => {
    // Một bộ xuất PDF đóng khung khối mã sẽ cho ra cả khối thụt đều k cột.
    // Quan hệ giữa các dòng vẫn đúng ⇒ `kiemThutLe()` im ⇒ Python ném
    // IndentationError ngay dòng đầu, ở tay học viên.
    const vao = [
      'Đoạn văn ở cột 0.',
      '  ```python',
      '  def f():',
      '      return 1',
      '  ```',
    ].join('\n');
    expect(rutLeKhoiMa(vao).split('\n')).toEqual([
      'Đoạn văn ở cột 0.',
      '```python',
      'def f():',
      '    return 1',
      '```',
    ]);
  });

  it('khối mã vốn ở cột 0 thì KHÔNG đụng tới', () => {
    const vao = ['```python', 'def f():', '    return 1', '```'].join('\n');
    expect(rutLeKhoiMa(vao)).toBe(vao);
  });
});

// ─────────────────── PDF: nói THẲNG nó dùng được tới đâu ────────────────────

describe('PDF — giới hạn đo được, không phải phỏng đoán', () => {
  /** Bài dựng từ văn bản PDF (đường theo toạ độ), đúng như extractText làm. */
  const tuPdf = () =>
    svc.parseTemplate(
      bocRacPdf(rutLeKhoiMa(PDF_THO)),
      'lesson-fstring.pdf',
      MOC,
    );

  it('bài từ PDF cho ra CA CHẤM, CHỖ TRỐNG và CODE y hệt bản .md', () => {
    // Phép so mạnh nhất có sẵn trong repo: cùng một nội dung, hai định dạng,
    // phải ra cùng một bài. Trước bản này thì KHÔNG so được — file PDF mẫu bị
    // từ chối thẳng vì mất thụt lề.
    const pdf = tuPdf();
    const md = svc.parseTemplate(MD_MAU, 'lesson-fstring.md', MOC);
    expect(pdf.errors).toEqual([]);
    expect(md.errors).toEqual([]);

    expect(pdf.lesson!.step_1).toEqual(md.lesson!.step_1);
    expect(pdf.lesson!.step_3).toEqual(md.lesson!.step_3);
    expect(pdf.lesson!.step_4).toEqual(md.lesson!.step_4);

    // Nói thẳng ba thứ mà đợt này ra đời để cứu, thay vì chỉ tin vào toEqual.
    const four = b4(pdf.lesson);
    expect(four.tests).toHaveLength(3);
    expect(four.starterCode).toContain('\n    result = []');
    expect(b3(pdf.lesson).scaffold?.template).toContain('\n    {{slot1}}');
  });

  it('CHỖ KHÔNG GIỐNG ĐƯỢC: dòng dài bị ngắt theo bề rộng trang', () => {
    // Đo trên chính file PDF này: dòng phân loại bị cắt giữa thẻ thứ ba, nên
    // thẻ `f"{x!r}"` vào bài thành `f"`. Toạ độ KHÔNG chữa được — dòng tiếp
    // theo của một dòng bị cắt nằm ở đúng cột 0 như một dòng mới thật. Nên
    // cảnh báo PDF phải Ở LẠI, kể cả khi file sạch lỗi.
    expect(PDF_THO).toContain('`f"\n{x!r}"`');

    const pdf = tuPdf();
    const md = svc.parseTemplate(MD_MAU, 'lesson-fstring.md', MOC);
    const the = (l: typeof pdf.lesson) =>
      b2(l).classify?.tokens?.map((t) => t.label);
    expect(the(md.lesson)).toContain('f"{x!r}"');
    expect(the(pdf.lesson)).toContain('f"');
    // Đúng MỘT thẻ lệch — đó là toàn bộ khoảng cách giữa hai định dạng.
    expect(the(pdf.lesson)).toHaveLength(6);

    expect(pdf.warnings.some((w) => w.includes('BỀ RỘNG TRANG'))).toBe(true);
    // File .md cùng nội dung thì KHÔNG có cảnh báo này.
    expect(md.warnings).toEqual([]);
  });

  it('LƯỚI AN TOÀN còn nguyên: bản bóc PHẲNG vẫn bị TỪ CHỐI', () => {
    // Đường dự phòng (không đo được lưới chữ đều bề) vẫn đi qua `kiemThutLe()`
    // và vẫn đỏ. Hàng rào này KHÔNG được nới ra để file mẫu qua được — thứ
    // được sửa là nguồn văn bản, không phải phép kiểm.
    const { errors } = svc.parseTemplate(
      bocRacPdf(PDF_PHANG),
      'lesson-fstring.pdf',
      MOC,
    );
    expect(errors.some((e) => e.includes('MẤT THỤT LỀ'))).toBe(true);
  });

  it('khôi phục SAI thì lưới an toàn vẫn bắt được', () => {
    // Giả lập một bộ dựng lại hỏng: trả về đúng văn bản ấy nhưng đánh rơi
    // khoảng trắng đầu dòng. Bài phải bị TỪ CHỐI, không được lọt vào DB.
    const hong = rutLeKhoiMa(PDF_THO).replace(/^[ ]+/gm, '');
    const { errors } = svc.parseTemplate(hong, 'lesson-fstring.pdf', MOC);
    expect(errors.some((e) => e.includes('MẤT THỤT LỀ'))).toBe(true);
  });
});

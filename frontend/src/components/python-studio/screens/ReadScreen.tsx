'use client';

// S1 · Bài đọc: một LÁT của `step_1.read` (khoá 172 bài "Python cho Data
// Analyst" — xem scripts/pe-da/SCHEMA.md). Nguồn của khoá này là giáo trình
// ĐỌC: không trắc nghiệm, không scaffold, không ca kiểm thử — nên màn này
// không chấm gì, nó chỉ phải trình bày đúng.
//
// Lát nào thuộc màn nào do KHÂU BUILD quyết (một màn = một ý được một đoạn code
// chứng minh); ở đây chỉ lấy `read[scr.index]` và đổ ra theo thứ tự. Renderer
// KHÔNG chia lại, nếu không khoá màn `s1-read-<i>` của bản nháp sẽ đổi mỗi lần
// sửa luật chia.
//
// Màn này chạy ở CỘT RỘNG như màn lý thuyết (StudioLesson truyền `wide`): bảng
// và khối code cần chiều ngang. Riêng đoạn văn vẫn bó ~78 ký tự — xem
// .read p trong studio-chrome.module.css.
import { useState } from 'react';

import CodeBlock from '@/components/lesson-chrome/exercises/CodeBlock';
import TryItButton from '@/components/lesson-chrome/TryItButton';
import { toCodeLines } from '@/lib/py-highlight';
import {
  doanDuocHinh,
  doanDuocOutput,
  khopDapAn,
  maDeThu,
  type ReadBlock,
} from '@/lib/studio-lesson';

import c from '../studio-chrome.module.css';
import { paragraphs, ScreenShell } from './chrome';
import type { LessonScreenProps } from './props';
import StepTrace from './StepTrace';

/**
 * Ô "Kết quả:" — output của đoạn code ngay trên.
 *
 * Vì sao `expected` KHÔNG nằm trong CodeBlock: nó là cái chương trình IN RA,
 * không phải dòng lệnh tiếp theo. Nhồi chung một thẻ (có số dòng, có tô màu cú
 * pháp) thì học viên đọc output như code — đúng loại ngộ nhận mà cả giáo trình
 * này đang cố gỡ.
 */
function KetQua({ expected }: { expected: string }) {
  return (
    <div className={c.readExpected}>
      <span className={c.readExpectedLabel}>Kết quả:</span>
      <pre>{expected}</pre>
    </div>
  );
}

/**
 * CỔNG DỰ ĐOÁN OUTPUT — ô gõ + nút, mở ra thì hiện ô "Kết quả:" kèm một câu
 * verdict.
 *
 * Lý lẽ và phép chọn khối nằm ở `doanDuocOutput` trong lib/studio-lesson.ts
 * (508/508 khối code của khoá in sẵn đáp án; Hundhausen 2002 / Brod 2021).
 * Khuôn thì CHÉP của `StepTrace`: cùng `disabled={!doan.trim()}`, cùng nhánh
 * "chưa nộp → form, đã nộp → verdict", cùng bộ class CSS `tracePredict*` —
 * dựng một bộ class thứ hai là hai cổng trông khác nhau trên cùng một màn.
 *
 * BA chi tiết là YÊU CẦU, không phải thẩm mỹ:
 *
 *  1. Ô "Kết quả:" MỞ RA dù đoán đúng hay sai. Giấu output của người đoán sai
 *     là lấy đi đúng thứ họ cần nhất lúc đó (Brod 2021: đoán sai → ngạc nhiên
 *     → chú ý dồn vào đáp án đúng). Đây là bước CAM KẾT, không phải bài thi.
 *
 *  2. Verdict KHÔNG phán xét, và nó phải NÓI RA giới hạn của phép so.
 *     `khopDapAn` chỉ bỏ khoảng trắng — nó KHÔNG bỏ dấu nháy hay dấu ngoặc
 *     (cố ý: `2` và `'2'` là hai giá trị khác nhau, và phân biệt được chúng là
 *     một trong những thứ giáo trình này dạy). Nên `[ 6  8 10]` đòi đúng
 *     ngoặc, và một người đoán ĐÚNG mà viết `6 8 10` sẽ nhận "chưa khớp". Vì
 *     vậy chữ là "chưa khớp từng ký tự", không phải "sai", và câu sau nói
 *     thẳng rằng đoán đúng ý mà viết khác dấu vẫn ra chữ đó.
 *
 *  3. KHÔNG animation lúc mở đáp án. Cùng kết luận đã ghim cho khối `diagram`
 *     (Tversky 2002, xem SCHEMA.md): giá trị nằm ở việc SO hai thứ cạnh nhau,
 *     mà so sánh thì cần cả hai cùng có mặt — một nhịp chạy lần lượt phá đúng
 *     cái nó định giúp. Ô "Kết quả:" dùng lại nguyên class `readExpected` của
 *     khối thường, nên nó hiện ra giống hệt khối không có cổng.
 */
function CongDuDoan({
  expected,
  daNop,
  onNop,
}: {
  expected: string;
  /** `undefined` = chưa nộp. Đến từ `draft.readGuess`, nên nó sống qua lần rời màn. */
  daNop: string | undefined;
  onNop: (doan: string) => void;
}) {
  // Chữ ĐANG GÕ mà chưa nộp thì chỉ ở đây: xem LessonDraft.readGuess để biết vì
  // sao không thêm một trường nháp thứ hai cho nó.
  const [doan, setDoan] = useState('');

  if (daNop === undefined) {
    return (
      <form
        className={c.tracePredict}
        onSubmit={(e) => {
          e.preventDefault();
          if (doan.trim()) onNop(doan.trim());
        }}
      >
        <p className={c.tracePredictAsk}>
          <strong>Đoán trước đã:</strong> đoạn code trên in ra gì?
        </p>
        <p className={c.tracePredictWhy}>
          Đoán sai cũng được — chính lúc thấy mình đoán sai là lúc kết quả dưới đây
          đáng đọc nhất. Đọc mà không đoán thì gần như không đọng lại gì. In ra nhiều
          dòng thì gõ liền nhau trên một dòng cũng được.
        </p>
        <span className={c.tracePredictLine}>
          <input
            className={c.tracePredictInput}
            value={doan}
            onChange={(e) => setDoan(e.target.value)}
            placeholder="đoạn code trên in ra gì?"
            aria-label="Đoán xem đoạn code trên in ra gì"
            autoComplete="off"
            spellCheck={false}
          />
          <button type="submit" className={c.tracePredictGo} disabled={!doan.trim()}>
            Xem kết quả
          </button>
        </span>
      </form>
    );
  }

  const khop = khopDapAn(daNop, expected);

  return (
    <>
      <p className={khop ? c.traceVerdictOk : c.traceVerdictNo}>
        {khop ? 'Khớp. ' : 'Chưa khớp từng ký tự. '}
        <span className={c.traceVerdictNote}>
          Bạn đoán <code>{daNop}</code>.
          {khop
            ? ''
            : ' Phép so chỉ bỏ khoảng trắng, không bỏ dấu nháy hay dấu ngoặc — nên đoán đúng ý mà viết khác dấu vẫn ra dòng này. Đối chiếu với kết quả thật ngay dưới.'}
        </span>
      </p>
      <KetQua expected={expected} />
    </>
  );
}

/**
 * CỔNG DỰ ĐOÁN HÌNH — che biểu đồ cho tới khi người học nói trước nó trông thế nào.
 *
 * Lý lẽ và phép chọn khối ở `doanDuocHinh` (lib/studio-lesson.ts). Khuôn CHÉP
 * của `CongDuDoan`: cùng `disabled={!doan.trim()}`, cùng bộ class `tracePredict*`
 * — dựng một bộ class thứ hai là hai cổng trông khác nhau trên cùng một màn.
 *
 * KHÁC một chỗ, và đó là chỗ phải nói ra: KHÔNG CÓ VERDICT. Không có đáp án máy
 * đọc được cho "hình sắp hiện trông thế nào", nên sau khi mở chỉ còn chính cái
 * hình để người học tự đối chiếu. Bịa một lời chấm ở đây là nói một câu mà nền
 * tảng không biết đúng hay sai.
 *
 * Câu hỏi hỏi ba thứ CỤ THỂ (trục ngang, trục dọc, mấy cột/mấy đường) chứ không
 * hỏi "bạn nghĩ hình trông thế nào": một câu hỏi mở thì trả lời được bằng một
 * chữ, mà phần có bằng chứng của cổng nằm ở chỗ người học phải DỰNG một dự đoán
 * có hình dạng.
 */
function CongDuDoanHinh({
  daNop,
  onNop,
  children,
}: {
  daNop: string | undefined;
  onNop: (doan: string) => void;
  children: React.ReactNode;
}) {
  const [doan, setDoan] = useState('');
  if (daNop !== undefined) return <>{children}</>;
  return (
    <form
      className={c.tracePredict}
      onSubmit={(e) => {
        e.preventDefault();
        if (doan.trim()) onNop(doan.trim());
      }}
    >
      <p className={c.tracePredictAsk}>
        <strong>Trước khi mở hình:</strong> trục ngang là gì, trục dọc là gì, và hình
        sẽ có mấy cột (hoặc mấy đường)?
      </p>
      <p className={c.tracePredictWhy}>
        Đoán sai cũng được — mở ra rồi tự đối chiếu. Phần này không chấm, vì không có
        đáp án nào máy đọc được cho một cái biểu đồ.
      </p>
      <span className={c.tracePredictLine}>
        <input
          className={c.tracePredictInput}
          value={doan}
          onChange={(e) => setDoan(e.target.value)}
          placeholder="ví dụ: trục ngang là giờ, trục dọc là số cốc, 10 cột"
          aria-label="Đoán xem biểu đồ sắp hiện trông thế nào"
          autoComplete="off"
        />
        <button type="submit" className={c.tracePredictGo} disabled={!doan.trim()}>
          Mở hình
        </button>
      </span>
    </form>
  );
}

/**
 * Một khối — SÁU loại (xem READ_BLOCK_TYPES).
 *
 * `switch` có nhánh `default` ép kiểu `never` chứ KHÔNG phải chuỗi `if` rồi
 * rơi tự do xuống nhánh cuối: bản trước viết `if paragraph … if code … return
 * <table>`, nên khi khâu build phát thêm `figure`/`terminal` thì khối hình rơi
 * vào nhánh bảng và `block.headers.map` ném TypeError — 26 bài có hình thành
 * trang trắng trước mặt người học. Với `never`, thêm loại khối mà quên renderer
 * thì `npm run typecheck` đỏ ngay.
 *
 * Vì sao `expected` KHÔNG nằm trong CodeBlock: xem <KetQua>.
 */
function Block({
  block,
  thu,
  daNop,
  onNop,
  coCongHinh,
}: {
  block: ReadBlock;
  thu?: string | null;
  daNop: string | undefined;
  onNop: (doan: string) => void;
  /** Khối `figure` này có dựng cổng không — xem `doanDuocHinh`. */
  coCongHinh?: boolean;
}) {
  switch (block.type) {
    case 'paragraph':
      return <p>{paragraphs(block.text)}</p>;

    case 'code':
      return (
        <>
          <div className={c.readCode}>
            <CodeBlock
              filename="python"
              langTag="ví dụ trong bài"
              lines={toCodeLines(block.code)}
            />
          </div>
          {/* Khối ĐỦ ĐIỀU KIỆN thì output nằm SAU một cổng dự đoán; khối không
              đủ thì in thẳng như trước. Phép chọn là `doanDuocOutput` — một
              hàm thuần ở lib, không phải một điều kiện viết tại đây: luật
              trong component là luật không có test. */}
          {doanDuocOutput(block) && block.expected ? (
            <CongDuDoan expected={block.expected} daNop={daNop} onNop={onNop} />
          ) : block.expected ? (
            <KetQua expected={block.expected} />
          ) : null}
          {/* Nút đứng DƯỚI ô "Kết quả:", không ở trên: người học đọc code →
              đọc kết quả → mới nảy ra "nếu sửa chỗ này thì sao". Nhãn nói rõ
              khi mã bàn giao gồm cả các đoạn trước (xem `maDeThu`), vì bấm vào
              rồi thấy nhiều code hơn đoạn vừa đọc là một bất ngờ không cần
              thiết. */}
          {thu ? (
            <TryItButton
              code={thu}
              label={
                thu.includes('# ── Đoạn ')
                  ? 'Thử trong IDE (kèm các đoạn trên)'
                  : 'Thử ngay trong IDE'
              }
              spaced
            />
          ) : null}
          {/* BẢNG TỪNG BƯỚC, ẨN SẴN. Đứng SAU nút "Thử ngay trong IDE" có lý
              do: hai nút trả lời hai câu khác nhau, và câu "đoạn này chạy thế
              nào" chỉ nảy ra SAU khi người học đã thấy có chỗ để tự thử. Vết
              chỉ có ở khối nào khâu build sinh được (module 2 trở đi, và phải
              ra được một câu dự đoán) — xem ReadTrace. */}
          {block.trace ? <StepTrace trace={block.trace} code={block.code} /> : null}
        </>
      );

    // Lệnh SHELL, không phải Python. Ba thứ cố ý khác khối `code`: có dấu nhắc
    // `$`, KHÔNG tô cú pháp Python (`import`/`in` trong một lệnh shell mà bị tô
    // màu từ khoá là nói sai), và KHÔNG số dòng — đánh số làm nó trông như một
    // chương trình, trong khi mỗi dòng là một lệnh gõ riêng.
    case 'terminal':
      return (
        <>
          <div className={c.readTerminal}>
            <span className={c.readTerminalLabel}>Terminal — gõ trên máy của bạn</span>
            {block.code
              .replace(/\n+$/, '')
              .split('\n')
              .map((line, i) => (
                <pre key={i}>
                  <span aria-hidden="true">$ </span>
                  {line}
                </pre>
              ))}
          </div>
          {/* `expected` của khối terminal là MÔ TẢ bằng lời ("lệnh thường không
              in thông báo…"), không phải stdout — nên nhãn không thể là
              "Kết quả:" và khối không được trông như console. */}
          {block.expected ? (
            <p className={c.readTerminalNote}>
              <strong>Dấu hiệu thành công:</strong> {paragraphs(block.expected)}
            </p>
          ) : null}
        </>
      );

    // Biểu đồ do chính đoạn code ngay trên vẽ ra. KHÔNG dùng lại <Figure> của
    // màn lý thuyết: `LessonFigure.caption` là trường bắt buộc mà khối này
    // không có, và `.theoryFigure img` ghim `aspect-ratio: 2 / 1` trong khi
    // 68/80 ảnh ở đây là 780×455 (tỉ lệ 1,71) — dùng lại là méo hết.
    case 'figure': {
      const anh = (
        <figure className={c.readFigure}>
          {/* next/image không hợp: PNG đã nằm sẵn trong public/ và khổ cố định,
              tối ưu hoá chỉ thêm một vòng xử lý. width/height là khổ THẬT của
              68/80 ảnh, đặt để trước khi ảnh tải xong khung đã có chỗ; `height:
              auto` trong CSS nên ảnh khổ khác tự về tỉ lệ thật của nó sau khi
              tải (không bị kéo méo như khi ghim aspect-ratio). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.src} alt={block.alt} width={780} height={455} loading="lazy" />
        </figure>
      );
      // Khối không đủ điều kiện (hình THỨ HAI của màn) thì hiện thẳng.
      if (!coCongHinh) return anh;
      return (
        <CongDuDoanHinh daNop={daNop} onNop={onNop}>
          {anh}
        </CongDuDoanHinh>
      );
    }

    // Bảng: bảng HTML thường, có <th> thật để trình đọc màn hình đọc được tên
    // cột khi nhảy ô — không dùng div grid.
    case 'table':
      return (
        <div className={c.readTable}>
          <table>
            <thead>
              <tr>
                {block.headers.map((h, i) => (
                  <th key={i} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    // SƠ ĐỒ bằng DOM, không phải ảnh. Xem ReadBlock để biết vì sao: chữ của
    // trang reflow, chữ trong PNG thì scale — ba trên bốn người thử báo "chữ
    // và nhãn TRONG sơ đồ quá nhỏ, phải phóng to mới đọc được", và CSS không
    // với tới được pixel trong ảnh.
    //
    // <ol> chứ không phải chuỗi <span>: các bước là một DÃY CÓ THỨ TỰ, và danh
    // sách có thứ tự nói ra điều đó cho trình đọc màn hình mà không cần thêm
    // chữ nào ("mục 1 trên 3"). Dấu nối giữa các bước do CSS
    // `li + li::before` vẽ: nó là trang trí, nên không nằm trong DOM — để nó
    // trong DOM là bắt trình đọc màn hình đọc "right arrow" giữa mỗi bước.
    case 'diagram':
      return (
        <figure className={c.readDiagram}>
          {/* CẢ BA chỗ có chữ (title, label, note) đều đi qua CÙNG `paragraphs`,
              tức cùng `withInlineCode`. Chỗ nào dựng chuỗi TRẦN là chỗ in ra
              nguyên hai dấu backtick — đúng lỗi người thử gửi ảnh ngày 27/10 ở
              ô tổng kết, và nó hỏng vì đúng lý do đó: cùng một câu chữ đi hai
              đường, ra hai kết quả. */}
          <figcaption className={c.readDiagramTitle}>{paragraphs(block.title)}</figcaption>
          <div className={c.readDiagramGrid}>
            {block.lanes.map((lane, i) => (
              <div key={i} className={c.readDiagramLane}>
                <p className={c.readDiagramLabel}>{paragraphs(lane.label)}</p>
                <ol className={c.readDiagramSteps}>
                  {lane.steps.map((step, j) => (
                    <li key={j}>
                      <code>{step}</code>
                    </li>
                  ))}
                </ol>
                <p className={c.readDiagramNote}>{paragraphs(lane.note)}</p>
              </div>
            ))}
          </div>
        </figure>
      );

    default: {
      // Chốt kiểu: loại khối mới mà chưa có nhánh thì dòng này không biên dịch
      // được. Vẫn trả null để nếu DỮ LIỆU (chạy lúc runtime) có loại lạ thì màn
      // chỉ thiếu một khối, không trắng cả trang.
      const unhandled: never = block;
      void unhandled;
      return null;
    }
  }
}

type Props = Pick<
  LessonScreenProps,
  'lesson' | 'scr' | 'metaLabel' | 'draft' | 'update'
>;

export default function ReadScreen({ lesson, scr, metaLabel, draft, update }: Props) {
  const slices = lesson.step_1?.read ?? [];
  const at = scr.index ?? 0;
  const blocks = slices[at] ?? [];

  return (
    <ScreenShell
      scr={scr}
      metaLabel={metaLabel}
      // Đếm phần ngay trên thẻ: bài dài nhất của khoá này trải ra nhiều màn
      // đọc liền nhau, không có mốc thì người học không biết còn bao nhiêu.
      title={
        slices.length > 1
          ? `${lesson.step_1?.heading || 'Bài đọc'} · phần ${at + 1}/${slices.length}`
          : lesson.step_1?.heading || 'Bài đọc'
      }
    >
      <div className={c.read}>
        {blocks.map((block, i) => (
          <Block
            key={i}
            block={block}
            // Tính ở ĐÂY, không trong <Block>: tiền tố cần cả `slices` và chỉ
            // số màn, mà Block chỉ nên biết về một khối.
            thu={block.type === 'code' && block.tryIt ? maDeThu(slices, at, i) : null}
            coCongHinh={doanDuocHinh(blocks, i)}
            // Khoá nháp mang CẢ chỉ số màn: `i` một mình trùng nhau giữa các
            // màn đọc của cùng một bài, nên đoán ở màn 1 sẽ mở sẵn đáp án của
            // khối cùng vị trí ở màn 2.
            daNop={draft.readGuess?.[`${at}-${i}`]}
            onNop={(doan) =>
              update({ readGuess: { ...(draft.readGuess ?? {}), [`${at}-${i}`]: doan } })
            }
          />
        ))}
      </div>
      {/* ĐÃ BỎ dòng "Nguồn: All_slide_one_file.pdf tr. 34-36; Python —
          Tutorial" ở cuối màn đọc cuối (29/10/2026). Chủ dự án: "không cần ghi
          nguồn" — nó là mốc truy nguồn của khâu soạn sách, còn với người học
          thì số trang của một file PDF họ không có là một dòng chữ không dùng
          được.
          `source.slides` VẪN còn trong bản dựng và trong `course.json`: bỏ
          phần DỰNG RA, không bỏ dữ liệu. `check.py` vẫn cảnh báo khi một bài
          mất nó, nên đường truy nguồn ở phía soạn sách không mất. */}
    </ScreenShell>
  );
}

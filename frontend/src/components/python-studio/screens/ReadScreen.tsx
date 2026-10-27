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
import CodeBlock from '@/components/lesson-chrome/exercises/CodeBlock';
import TryItButton from '@/components/lesson-chrome/TryItButton';
import { toCodeLines } from '@/lib/py-highlight';
import { maDeThu, type ReadBlock } from '@/lib/studio-lesson';

import c from '../studio-chrome.module.css';
import { paragraphs, ScreenShell } from './chrome';
import type { ShellProps } from './props';

/**
 * Một khối — NĂM loại (xem READ_BLOCK_TYPES).
 *
 * `switch` có nhánh `default` ép kiểu `never` chứ KHÔNG phải chuỗi `if` rồi
 * rơi tự do xuống nhánh cuối: bản trước viết `if paragraph … if code … return
 * <table>`, nên khi khâu build phát thêm `figure`/`terminal` thì khối hình rơi
 * vào nhánh bảng và `block.headers.map` ném TypeError — 26 bài có hình thành
 * trang trắng trước mặt người học. Với `never`, thêm loại khối mà quên renderer
 * thì `npm run typecheck` đỏ ngay.
 *
 * Vì sao `expected` KHÔNG nằm trong CodeBlock: nó là cái chương trình IN RA,
 * không phải dòng lệnh tiếp theo. Nhồi chung một thẻ (có số dòng, có tô màu cú
 * pháp) thì học viên đọc output như code — đúng loại ngộ nhận mà cả giáo trình
 * này đang cố gỡ.
 */
function Block({ block, thu }: { block: ReadBlock; thu?: string | null }) {
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
          {block.expected ? (
            <div className={c.readExpected}>
              <span className={c.readExpectedLabel}>Kết quả:</span>
              <pre>{block.expected}</pre>
            </div>
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
    case 'figure':
      return (
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

export default function ReadScreen({ lesson, scr, metaLabel }: ShellProps) {
  const slices = lesson.step_1?.read ?? [];
  const at = scr.index ?? 0;
  const blocks = slices[at] ?? [];
  const slides = lesson.source?.slides;

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
          />
        ))}
      </div>
      {/* Nguồn slide chỉ in ở màn đọc CUỐI: lặp lại ở từng lát thì nó thành
          nhiễu, mà bỏ hẳn thì mất đường truy nguồn. In nguyên văn — chuỗi này
          có thể là nhiều khoảng trang rời ("SL 95-105, 133"). */}
      {slides && at === slices.length - 1 && (
        <p className={c.readSource}>Nguồn: {slides}</p>
      )}
    </ScreenShell>
  );
}

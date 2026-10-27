'use client';

// S2 · Trắc nghiệm: một màn cho MỖI câu (scr.index trỏ vào step_2.mcq).
import CodeBlock from '@/components/lesson-chrome/exercises/CodeBlock';
import Mcq from '@/components/lesson-chrome/exercises/Mcq';
import { toCodeLines } from '@/lib/py-highlight';
import { correctIndex, letterKey, optionDetail, optionText, tachDeVaCode } from '@/lib/studio-lesson';

import c from '../studio-chrome.module.css';
import { ScreenShell } from './chrome';
import type { LessonScreenProps } from './props';

type Props = Pick<
  LessonScreenProps,
  'lesson' | 'scr' | 'metaLabel' | 'draft' | 'update' | 'clearChecked' | 'checked' | 'verdict'
>;

export default function McqScreen({
  lesson,
  scr,
  metaLabel,
  draft,
  update,
  clearChecked,
  checked,
  verdict,
}: Props) {
  const i = scr.index ?? 0;
  const q = lesson.step_2?.mcq?.[i];
  if (!q) return null;
  // 471/1032 câu của gói mang một đoạn code mà đề bài TRỎ TỚI; build gấp nó vào
  // `question` và ở đây tách ra để dựng đúng loại. Nhồi chung vào tiêu đề thì
  // code dồn thành một dòng — xem `tachDeVaCode`.
  const { de, code } = tachDeVaCode(q.question);
  return (
    <ScreenShell scr={scr} metaLabel={metaLabel} title={de} verdict={verdict}>
      {code ? (
        <div className={c.readCode}>
          <CodeBlock filename="python" langTag="đoạn code của câu hỏi" lines={toCodeLines(code)} />
        </div>
      ) : null}
      <Mcq
        options={q.options.map((o, oi) => ({
          key: letterKey(oi),
          label: optionText(o),
          sub: checked ? optionDetail(o) : undefined,
        }))}
        selected={draft.mcq[i] ?? null}
        onSelect={(key) => {
          clearChecked();
          update({ mcq: { ...draft.mcq, [i]: key } });
        }}
        correctKey={letterKey(correctIndex(q))}
        checked={checked}
      />
    </ScreenShell>
  );
}

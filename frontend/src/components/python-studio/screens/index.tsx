'use client';

// Bộ phân tuyến màn hình: đổi `scr.kind` thành đúng một component trong
// thư mục này. Trước đây đây là một chuỗi `if` dài trong StudioLesson.tsx.
import LessonBrief from '@/components/lesson-chrome/LessonBrief';
import UnknownScreenNotice from '@/components/lesson-chrome/UnknownScreenNotice';
import { ideCodeChoDeBai } from '@/lib/ide-brief-code';

import ClassifyScreen from './ClassifyScreen';
import ContextScreen from './ContextScreen';
import CounterScreen from './CounterScreen';
import ExplainScreen from './ExplainScreen';
import GameScreen from './GameScreen';
import McqScreen from './McqScreen';
import MemoryScreen from './MemoryScreen';
import MisconceptionScreen from './MisconceptionScreen';
import PredictScreen from './PredictScreen';
import RecapScreen from './RecapScreen';
import SandboxScreen from './SandboxScreen';
import ScaffoldScreen from './ScaffoldScreen';
import SelfExplainScreen from './SelfExplainScreen';
import TheoryScreen from './TheoryScreen';
import TraceScreen from './TraceScreen';
import type { LessonScreenProps } from './props';

export type { LessonScreenProps };

export default function LessonScreenView(props: LessonScreenProps) {
  const { lesson, scr, game } = props;
  // Dùng chung cho hai nhánh "không dựng được màn" dưới đây.
  const notice = (what: 'màn' | 'mini-game', kind: unknown) => (
    <UnknownScreenNotice
      what={what}
      kind={kind}
      lessonLabel={props.metaLabel ?? lesson.title}
      metaLabel={props.metaLabel}
    />
  );

  switch (scr.kind) {
    case 'brief':
      // Màn mở đầu "một màn" theo Figma: tự có tiêu đề, không bọc trong ShellB.
      // `tryCode` tính từ CẢ bài (cần step_4), nên không nằm trong brief được.
      return lesson.step_1?.brief ? (
        <LessonBrief {...lesson.step_1.brief} tryCode={ideCodeChoDeBai(lesson) ?? undefined} />
      ) : null;
    case 'theory':
      return <TheoryScreen {...props} />;
    case 'context':
      return <ContextScreen {...props} />;
    case 'explain':
      return <ExplainScreen {...props} />;
    case 'memory':
      return <MemoryScreen {...props} />;
    case 'misconception':
      return <MisconceptionScreen {...props} />;
    case 'predict':
      return <PredictScreen {...props} />;
    case 'mcq':
      return <McqScreen {...props} />;
    case 'classify':
      return <ClassifyScreen {...props} />;
    case 'selfExplain':
      return <SelfExplainScreen {...props} />;
    case 'scaffold':
      return <ScaffoldScreen {...props} />;
    case 'trace':
      return <TraceScreen {...props} />;
    case 'counter':
      return <CounterScreen {...props} />;
    case 'game':
      // `scr.gameId` không tìm thấy trong `play.games` cũng ra màn trắng y như
      // `kind` sai chính tả, nên báo cùng một kiểu.
      return game ? <GameScreen {...props} game={game} /> : notice('mini-game', scr.gameId);
    case 'sandbox':
      return <SandboxScreen {...props} />;
    case 'recap':
      return <RecapScreen {...props} />;
    default:
      // KHÔNG trả `null` ở đây. Trước đây nhánh này im lặng, nên một `kind` sai
      // chính tả trong `lessons.content_json` (server không chặn giá trị nào —
      // xem @/lib/screen-kinds) biến thành màn trắng không dấu vết: không
      // ngoại lệ, không cảnh báo, không log. Giờ nó ghi console.warn kèm giá
      // trị nhận được và hiện khối báo lỗi đọc được cho người học.
      return notice('màn', scr.kind);
  }
}

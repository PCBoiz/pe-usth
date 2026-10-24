'use client';

// Bộ phân tuyến màn hình: đổi `scr.kind` thành đúng một component trong
// thư mục này. Trước đây đây là một chuỗi `if` dài trong StudioLesson.tsx.
import LessonBrief from '@/components/lesson-chrome/LessonBrief';
import { ideCodeChoDeBai } from '@/lib/ide-brief-code';

import ClassifyScreen from './ClassifyScreen';
import ContextScreen from './ContextScreen';
import CounterScreen from './CounterScreen';
import ExplainScreen from './ExplainScreen';
import GameScreen from './GameScreen';
import McqScreen from './McqScreen';
import MemoryScreen from './MemoryScreen';
import MisconceptionScreen from './MisconceptionScreen';
import PracticeScreen from './PracticeScreen';
import PredictScreen from './PredictScreen';
import ReadScreen from './ReadScreen';
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

  switch (scr.kind) {
    case 'brief':
      // Màn mở đầu "một màn" theo Figma: tự có tiêu đề, không bọc trong ShellB.
      // `tryCode` tính từ CẢ bài (cần step_4), nên không nằm trong brief được.
      return lesson.step_1?.brief ? (
        <LessonBrief {...lesson.step_1.brief} tryCode={ideCodeChoDeBai(lesson) ?? undefined} />
      ) : null;
    case 'read':
      return <ReadScreen {...props} />;
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
    case 'practice':
      return <PracticeScreen {...props} />;
    case 'selfExplain':
      return <SelfExplainScreen {...props} />;
    case 'scaffold':
      return <ScaffoldScreen {...props} />;
    case 'trace':
      return <TraceScreen {...props} />;
    case 'counter':
      return <CounterScreen {...props} />;
    case 'game':
      return game ? <GameScreen {...props} game={game} /> : null;
    case 'sandbox':
      return <SandboxScreen {...props} />;
    case 'recap':
      return <RecapScreen {...props} />;
    default:
      return null;
  }
}

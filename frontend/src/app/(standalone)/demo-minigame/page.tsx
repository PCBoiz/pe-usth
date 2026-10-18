import type { Metadata } from 'next';
import PageStyles from '@/components/PageStyles';
import MinigamePlayer from '@/components/minigame/MinigamePlayer';

export const metadata: Metadata = {
  title: 'Lắp ghép khung mã Python – Programming EDU',
  description: 'Trò chơi kéo thả và lắp ghép câu lệnh Python trực tiếp trong trình duyệt',
};

const STUDIO_CSS = [
  '/static/css/edu-fonts.css',
  '/static/css/edu-theme.css',
  '/static/css/studio-tokens.css',
];

export default function DemoMinigamePage() {
  return (
    <>
      <PageStyles hrefs={STUDIO_CSS} />
      <MinigamePlayer />
    </>
  );
}

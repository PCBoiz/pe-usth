import type { Metadata } from 'next';

import IdeClient from './IdeClient';

export const metadata: Metadata = {
  title: 'Python IDE – Programming EDU',
  description: 'Viết và chạy thử mã Python ngay trên trang, chạy trong sandbox cách ly trên máy chủ.',
};

export default function IdePage() {
  return <IdeClient />;
}

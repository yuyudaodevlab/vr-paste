import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CrossClip',
  description: 'QuestとPC間でクリップボードを共有',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className="dark">
      <body>
        {children}
      </body>
    </html>
  );
}

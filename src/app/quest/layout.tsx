import type { Metadata } from 'next';
import '../globals.css';

export const metadata: Metadata = {
  title: 'CrossClip - Quest',
};

export default function QuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="quest-bg min-h-screen text-gray-100 font-sans p-4 sm:p-8">
      <div className="max-w-6xl mx-auto h-full">
        {children}
      </div>
    </div>
  );
}

import type { Metadata } from 'next';
import './globals.css';
import { APP_NAME, ORG_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: APP_NAME,
  description: `Sistem pengurusan inventori untuk ${ORG_NAME}`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ms">
      <body>{children}</body>
    </html>
  );
}

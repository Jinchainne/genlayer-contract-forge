import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GenLayer Contract Forge',
  description: 'A deep GenLayer builder tool for contract readiness analysis, anti-pattern detection, and deployment planning.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

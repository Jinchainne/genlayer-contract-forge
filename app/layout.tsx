import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GenLayer Studio Contract Forge',
  description: 'A GenLayer-only builder workspace for contract review, comparison, deployment packs, and submission notes.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

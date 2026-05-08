import type { ReactNode } from 'react';
import './globals.css';

export const metadata = { title: 'Markup', description: 'HTML mockup review platform' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import { JetBrains_Mono, Manrope } from 'next/font/google';
import type { ReactNode } from 'react';
import LandingShell from '@/app/landing/layout';
import '@/app/globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono-loaded',
  display: 'swap',
});

export const metadata = {
  title: 'Markup — pin annotations for live frontends',
  description: 'Self-hosted HTML mockup review for humans and the agents that ship the fix.',
};

// Standalone root layout for the static-export build. Mirrors the shape of
// the main app's src/app/layout.tsx (next/font + body font-family + the
// :root font vars) but skips the ClientRoot tree — the landing surface
// doesn't need any of the product providers.
export default function ExportRootLayout({ children }: { children: ReactNode }) {
  const fontVars = `${manrope.variable} ${jetBrainsMono.variable}`;
  return (
    <html lang="en" className={fontVars} suppressHydrationWarning>
      <body
        style={{
          fontFamily: 'var(--font-manrope), Manrope, system-ui, sans-serif',
        }}
      >
        <style>{`
          :root {
            --font-display: var(--font-manrope), "Manrope", system-ui, sans-serif;
            --font-body: var(--font-manrope), "Manrope", system-ui, sans-serif;
            --font-mono: var(--font-mono-loaded), "JetBrains Mono", ui-monospace, monospace;
          }
        `}</style>
        <LandingShell>{children}</LandingShell>
      </body>
    </html>
  );
}

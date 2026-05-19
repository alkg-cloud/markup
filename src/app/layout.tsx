import { JetBrains_Mono, Manrope } from 'next/font/google';
import type { ReactNode } from 'react';
import { ClientRoot } from './ClientRoot';
import './globals.css';

/*
 * Manrope is loaded as the single typographic voice of the product — the
 * same family grapesjs.com uses, chosen here for the same reason: a
 * geometric, friendly, modern sans with strong weight contrast that
 * sidesteps the "Inter slop" trap. We pair body and display from the same
 * family so the type system stays opinionated without paying for a
 * commercial display face — the weight contrast (400 / 500 / 600 / 700 /
 * 800) does the work.
 *
 * JetBrains Mono is loaded for tabular timestamps + token plaintext only.
 */
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
  title: 'Markup',
  description: 'A focused review surface for HTML mockups.',
};

/**
 * Root layout. This is the only file in the project that stays as a
 * server component — its only job is to render the HTML shell, load
 * fonts, and mount `ClientRoot` (which owns providers + the page tree).
 * It MUST NOT fetch data. See `CLAUDE.md` → Client-side rendering rule.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
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
        <ClientRoot>{children}</ClientRoot>
      </body>
    </html>
  );
}

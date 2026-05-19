import { JetBrains_Mono, Manrope } from 'next/font/google';
import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/Toast/Toast';
import { TooltipPortal } from '@/components/Tooltip/TooltipPortal';
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

export default function RootLayout({ children }: { children: ReactNode }) {
  const fontVars = `${manrope.variable} ${jetBrainsMono.variable}`;
  return (
    <html lang="en" className={fontVars} suppressHydrationWarning>
      {/* Synchronous boot script — runs BEFORE React hydrates and
          BEFORE the first paint. Reads the persisted sidebar-collapsed
          flag from localStorage and writes it as a data attribute on
          `documentElement` so the Sidebar component can initialise its
          state from the same value. Without this, SSR rendered the
          sidebar expanded, the client hydrated expanded, then a
          useEffect read localStorage and re-rendered collapsed — that
          one-frame flash was the "sidebar pill bugando depois de
          navegar" bug. */}
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: the string
          is a literal compile-time constant. */}
      <script
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html:
            "try{if(localStorage.getItem('markup.sidebar.collapsed')==='true'){document.documentElement.dataset.sidebarCollapsed='1';}}catch(_){}",
        }}
      />
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
        <ToastProvider>{children}</ToastProvider>
        {/* Single global tooltip popover — every `[data-tooltip]` trigger
            in the app routes through this element. See
            `src/components/Tooltip/TooltipPortal.tsx`. */}
        <TooltipPortal />
      </body>
    </html>
  );
}

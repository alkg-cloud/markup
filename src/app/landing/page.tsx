'use client';

import { Brand } from '@/components/landing/primitives/Brand';
import { Eyebrow } from '@/components/landing/primitives/Eyebrow';
import { PillButton } from '@/components/landing/primitives/PillButton';
import { Section } from '@/components/landing/primitives/Section';
import { Topbar } from '@/components/landing/Topbar';

export default function LandingPage() {
  return (
    <main>
      <Topbar />
      <Section>
        <Brand size={28} />
        <Eyebrow>v0.2 · self-hosted · elastic-2.0</Eyebrow>
        <h1 style={{ color: 'var(--text-bright)' }}>Smoke test</h1>
        <PillButton>Spin it up</PillButton>
      </Section>
    </main>
  );
}

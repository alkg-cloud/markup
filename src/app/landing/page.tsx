'use client';

import { Hero } from '@/components/landing/Hero';
import { Topbar } from '@/components/landing/Topbar';

export default function LandingPage() {
  return (
    <main>
      <Topbar />
      <Hero />
    </main>
  );
}

'use client';

import { Hero } from '@/components/landing/Hero';
import { DemoStage } from '@/components/landing/InteractiveDemo/DemoStage';
import { ThreeUp } from '@/components/landing/ThreeUp';
import { Topbar } from '@/components/landing/Topbar';

export default function LandingPage() {
  return (
    <main>
      <Topbar />
      <Hero />
      <ThreeUp />
      <DemoStage />
    </main>
  );
}

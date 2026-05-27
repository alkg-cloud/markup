'use client';

import { CompareTable } from '@/components/landing/CompareTable';
import { Contributors } from '@/components/landing/Contributors';
import { FAQ } from '@/components/landing/FAQ';
import { FeatureGrid } from '@/components/landing/FeatureGrid';
import { FixLoopSteps } from '@/components/landing/FixLoopSteps';
import { Hero } from '@/components/landing/Hero';
import { DemoStage } from '@/components/landing/InteractiveDemo/DemoStage';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { Pricing } from '@/components/landing/Pricing';
import { Quickstart } from '@/components/landing/Quickstart';
import { ThreeUp } from '@/components/landing/ThreeUp';
import { Topbar } from '@/components/landing/Topbar';

export default function LandingPage() {
  return (
    <main>
      <Topbar />
      <Hero />
      <ThreeUp />
      <DemoStage />
      <FixLoopSteps />
      <FeatureGrid />
      <CompareTable />
      <Quickstart />
      <Pricing />
      <FAQ />
      <Contributors />
      <LandingFooter />
    </main>
  );
}

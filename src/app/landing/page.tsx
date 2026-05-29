'use client';

import { Contributors } from '@/components/landing/Contributors';
import { DesignFeatureFlow } from '@/components/landing/DesignFeatureFlow';
import { FAQ } from '@/components/landing/FAQ';
import { FeatureGrid } from '@/components/landing/FeatureGrid';
import { Hero } from '@/components/landing/Hero';
import { DemoStage } from '@/components/landing/InteractiveDemo/DemoStage';
import { LandingFooter } from '@/components/landing/LandingFooter';
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
      <DesignFeatureFlow />
      <FeatureGrid />
      <Quickstart />
      <FAQ />
      <Contributors />
      <LandingFooter />
    </main>
  );
}

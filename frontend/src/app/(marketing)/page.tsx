"use client";

import dynamic from "next/dynamic";
import { Hero } from "@/components/Hero";
import { StatsBar } from "@/components/StatsBar";
import { UseCases } from "@/components/UseCases";

// Lazy-load below-fold sections to reduce initial JS bundle
const Features = dynamic(() => import("@/components/Features").then(m => ({ default: m.Features })), { ssr: false });
const MeetingLifecycle = dynamic(() => import("@/components/MeetingLifecycle").then(m => ({ default: m.MeetingLifecycle })), { ssr: false });
const PrivacyByDesign = dynamic(() => import("@/components/PrivacyByDesign").then(m => ({ default: m.PrivacyByDesign })), { ssr: false });
const HowItWorks = dynamic(() => import("@/components/HowItWorks").then(m => ({ default: m.HowItWorks })), { ssr: false });
const MeetingOutputs = dynamic(() => import("@/components/MeetingOutputs").then(m => ({ default: m.MeetingOutputs })), { ssr: false });
const WorkspaceSyncFlow = dynamic(() => import("@/components/WorkspaceSyncFlow").then(m => ({ default: m.WorkspaceSyncFlow })), { ssr: false });
const ModesComparison = dynamic(() => import("@/components/ModesComparison").then(m => ({ default: m.ModesComparison })), { ssr: false });
const Testimonials = dynamic(() => import("@/components/Testimonials").then(m => ({ default: m.Testimonials })), { ssr: false });
const Pricing = dynamic(() => import("@/components/Pricing").then(m => ({ default: m.Pricing })), { ssr: false });
const FAQ = dynamic(() => import("@/components/FAQ").then(m => ({ default: m.FAQ })), { ssr: false });
const Footer = dynamic(() => import("@/components/Footer").then(m => ({ default: m.Footer })), { ssr: false });

export default function Home() {
  return (
    <main className="min-h-screen w-full overflow-x-hidden">
      <Hero />
      <StatsBar />
      <UseCases />
      <Features />
      <MeetingLifecycle />
      <PrivacyByDesign />
      <HowItWorks />
      <MeetingOutputs />
      <WorkspaceSyncFlow />
      <ModesComparison />
      <Testimonials />
      <Pricing />
      <FAQ />
      <Footer />
    </main>
  );
}

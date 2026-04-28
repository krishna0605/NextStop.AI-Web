"use client";

import dynamic from "next/dynamic";

import { CoreFeaturesDeck } from "@/components/CoreFeaturesDeck";
import { Hero } from "@/components/Hero";
import { UseCases } from "@/components/UseCases";

const Testimonials = dynamic(
  () => import("@/components/Testimonials").then((m) => ({ default: m.Testimonials })),
  { ssr: false }
);
const Pricing = dynamic(() => import("@/components/Pricing").then((m) => ({ default: m.Pricing })), {
  ssr: false,
});
const FAQ = dynamic(() => import("@/components/FAQ").then((m) => ({ default: m.FAQ })), { ssr: false });
const CtaSection = dynamic(
  () => import("@/components/CtaSection").then((m) => ({ default: m.CtaSection })),
  { ssr: false }
);
const Footer = dynamic(() => import("@/components/Footer").then((m) => ({ default: m.Footer })), {
  ssr: false,
});

export function MarketingHome() {
  return (
    <main className="min-h-screen w-full overflow-x-clip">
      <Hero />
      <UseCases />
      <CoreFeaturesDeck />
      <Testimonials />
      <Pricing />
      <FAQ />
      <CtaSection />
      <Footer />
    </main>
  );
}

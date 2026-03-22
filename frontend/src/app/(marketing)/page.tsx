import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { UseCases } from "@/components/UseCases";
import { HowItWorks } from "@/components/HowItWorks";
import { PrivacyByDesign } from "@/components/PrivacyByDesign";
import { Testimonials } from "@/components/Testimonials";
import { Pricing } from "@/components/Pricing";
import { FAQ } from "@/components/FAQ";
import { Footer } from "@/components/Footer";
import { MeetingOutputs } from "@/components/MeetingOutputs";
import { MeetingLifecycle } from "@/components/MeetingLifecycle";
import { SecurityBoundary } from "@/components/SecurityBoundary";
import { WorkspaceSyncFlow } from "@/components/WorkspaceSyncFlow";
import { ModesComparison } from "@/components/ModesComparison";

export default function Home() {
  return (
    <main className="min-h-screen w-full overflow-x-hidden">
      <Hero />
      <UseCases />
      <Features />
      <MeetingLifecycle />
      <PrivacyByDesign />
      <SecurityBoundary />
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

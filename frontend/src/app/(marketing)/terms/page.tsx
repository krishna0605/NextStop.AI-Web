import type { Metadata } from "next";

import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Terms of Service | NextStop.ai",
  description:
    "Terms for using NextStop.ai account, billing, desktop capture, web dashboard, AI, and integration workflows.",
};

const sections = [
  {
    title: "Using NextStop.ai",
    body: "NextStop.ai provides desktop capture, web review, post-meeting AI, workspace export, and integration workflows. You are responsible for using the service lawfully, maintaining account security, and ensuring you have permission to capture, process, or share meeting content.",
  },
  {
    title: "Accounts and access",
    body: "You must provide accurate account information and keep authentication credentials secure. We may suspend or restrict access when needed to protect users, investigate abuse, comply with legal requirements, or operate the service safely.",
  },
  {
    title: "Meeting content",
    body: "You retain responsibility for meeting audio, transcripts, summaries, decisions, action items, exports, and connected workspace content that you create, upload, process, or sync through NextStop.ai. You should not upload content that you do not have the right to process.",
  },
  {
    title: "AI outputs",
    body: "AI-generated summaries, tasks, decisions, risks, and related-meeting references may be incomplete or incorrect. Review outputs before relying on them for legal, financial, medical, employment, or other high-impact decisions.",
  },
  {
    title: "Subscriptions and billing",
    body: "Paid plan access depends on billing-provider events, subscription state, trial eligibility, and entitlement updates. Plan details may change with notice, and taxes, renewals, cancellations, and refunds are handled according to the checkout and subscription terms shown during purchase.",
  },
  {
    title: "Service changes and availability",
    body: "We may improve, limit, pause, or discontinue features to maintain security, reliability, compliance, or product quality. Production readiness evidence, hosted verification, and launch certification are internal controls and do not guarantee uninterrupted service.",
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen w-full overflow-x-hidden pt-28">
      <section className="py-20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto max-w-3xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Legal
            </p>
            <h1 className="font-heading mb-6 text-4xl font-bold tracking-tight text-white md:text-6xl">
              Terms of Service
            </h1>
            <p className="text-lg leading-relaxed text-zinc-400">
              These terms define the baseline rules for using NextStop.ai account, billing,
              desktop capture, web dashboard, post-meeting AI, integration, and export workflows.
            </p>
            <p className="mt-4 text-sm text-zinc-500">Last updated: April 28, 2026</p>
          </div>
        </div>
      </section>

      <section className="border-t border-white/5 py-16">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto max-w-3xl space-y-8">
            {sections.map((section) => (
              <section
                key={section.title}
                className="rounded-2xl border border-white/8 bg-zinc-950/70 p-6"
              >
                <h2 className="font-heading mb-3 text-2xl font-semibold text-white">
                  {section.title}
                </h2>
                <p className="leading-relaxed text-zinc-400">{section.body}</p>
              </section>
            ))}
            <p className="text-sm leading-relaxed text-zinc-500">
              Questions about these terms can be sent to hello@nextstop.ai. This page is a
              production-readiness baseline and should receive final legal review before a broad
              public launch.
            </p>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}

import type { Metadata } from "next";

import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy | NextStop.ai",
  description: "How NextStop.ai handles account, billing, meeting, transcript, AI, and integration data.",
};

const sections = [
  {
    title: "What we collect",
    body: "We collect account details, authentication identifiers, billing state, workspace settings, integration connection metadata, meeting metadata, transcripts, generated meeting artifacts, export history, and support communications needed to operate NextStop.ai.",
  },
  {
    title: "Meeting data and AI processing",
    body: "NextStop is designed around local-first meeting capture. Audio is captured locally during the meeting. After a meeting is finalized, selected transcripts, metadata, and user-approved artifacts may be sent to the secure web service for transcription, analysis, regeneration, export, and workspace sync.",
  },
  {
    title: "Integrations",
    body: "Google and Notion integrations are used only to power requested calendar, meeting, destination, and export workflows. Integration tokens and workspace identifiers are handled server-side and scoped to the user actions required by the connected feature.",
  },
  {
    title: "Billing and subscriptions",
    body: "Billing events, subscription identifiers, plan state, trial state, payment-provider event identifiers, and entitlement updates are processed to provide access, prevent duplicate events, and support billing operations.",
  },
  {
    title: "Security and observability",
    body: "We use logs, metrics, error tracking, and trace data to operate the service, investigate failures, protect against abuse, and verify production readiness. Secrets and provider credentials are not intentionally exposed to client applications.",
  },
  {
    title: "Retention and user control",
    body: "Meeting outputs and workspace records are retained only as needed for the product workflow, user access, support, legal, security, and operational requirements. Users can contact support to request help with account, subscription, or data-access questions.",
  },
];

export default function PrivacyPage() {
  return (
    <>
      <main className="min-h-screen w-full overflow-x-hidden pt-28">
        <section className="py-20">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-3xl">
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Legal
              </p>
              <h1 className="font-heading mb-6 text-4xl font-bold tracking-tight text-white md:text-6xl">
                Privacy Policy
              </h1>
              <p className="text-lg leading-relaxed text-zinc-400">
                This policy explains how NextStop.ai handles the data needed to run account,
                billing, local capture, post-meeting AI, integration, export, and support workflows.
              </p>
              <p className="mt-4 text-sm text-zinc-500">Last updated: April 28, 2026</p>
            </div>
          </div>
        </section>

        <section className="border-t border-white/5 py-16">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-3xl space-y-8">
              {sections.map((section) => (
                <section key={section.title} className="rounded-2xl border border-white/8 bg-zinc-950/70 p-6">
                  <h2 className="font-heading mb-3 text-2xl font-semibold text-white">
                    {section.title}
                  </h2>
                  <p className="leading-relaxed text-zinc-400">{section.body}</p>
                </section>
              ))}
              <p className="text-sm leading-relaxed text-zinc-500">
                For privacy requests or questions, contact hello@nextstop.ai. This page is a
                production-readiness baseline and should receive final legal review before a broad
                public launch.
              </p>
            </div>
          </div>
        </section>
        <Footer />
      </main>
    </>
  );
}

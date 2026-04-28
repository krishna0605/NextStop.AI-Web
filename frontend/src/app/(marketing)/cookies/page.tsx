import type { Metadata } from "next";

import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Cookie Policy | NextStop.ai",
  description:
    "How NextStop.ai uses essential, security, analytics, and preference cookies or similar storage.",
};

const sections = [
  {
    title: "Essential storage",
    body: "NextStop.ai may use essential cookies, local storage, and similar browser storage to support authentication, session continuity, security checks, checkout redirects, and core application preferences.",
  },
  {
    title: "Security and abuse prevention",
    body: "We may use browser storage, request metadata, and provider controls to protect accounts, verify sessions, investigate suspicious activity, and reduce abuse of auth, billing, AI, and integration routes.",
  },
  {
    title: "Analytics and observability",
    body: "We may collect product telemetry, error events, performance traces, and aggregate usage signals to understand reliability, improve workflows, and verify production readiness. These signals should not intentionally include secrets or payment credentials.",
  },
  {
    title: "Third-party providers",
    body: "Authentication, billing, observability, and integration providers may set their own cookies or storage when you use related workflows such as OAuth, checkout, calendar, Notion export, error monitoring, or telemetry.",
  },
  {
    title: "Your choices",
    body: "You can control cookies through your browser settings. Blocking essential storage may prevent sign-in, checkout, workspace integrations, meeting review, or other application features from working correctly.",
  },
];

export default function CookiesPage() {
  return (
    <main className="min-h-screen w-full overflow-x-hidden pt-28">
      <section className="py-20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto max-w-3xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Legal
            </p>
            <h1 className="font-heading mb-6 text-4xl font-bold tracking-tight text-white md:text-6xl">
              Cookie Policy
            </h1>
            <p className="text-lg leading-relaxed text-zinc-400">
              This policy explains how NextStop.ai uses cookies and similar storage for essential
              app behavior, security, observability, preferences, billing, and integrations.
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
              Cookie questions can be sent to hello@nextstop.ai. This page is a
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

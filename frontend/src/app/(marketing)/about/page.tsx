import { Footer } from "@/components/Footer";
import { Shield, Eye, Boxes } from "lucide-react";

const values = [
  {
    icon: <Shield className="h-8 w-8" style={{ color: "var(--brand-trust)" }} />,
    title: "Privacy-first",
    description:
      "Audio stays on the user's machine during the meeting. The post-meeting AI pipeline runs through a secure gateway that holds the production keys so they never reach the desktop app.",
  },
  {
    icon: <Eye className="h-8 w-8" style={{ color: "var(--brand-primary)" }} />,
    title: "Operator-grade",
    description:
      "NextStop is built for people who run meetings professionally. Every surface — from the session launcher to the review flow — is designed for structured, repeatable meeting operations.",
  },
  {
    icon: <Boxes className="h-8 w-8" style={{ color: "var(--brand-support)" }} />,
    title: "Workspace-native",
    description:
      "Meeting outputs route directly into Notion, Google Calendar, and canonical markdown artifacts. The follow-up finishes inside the workspace the team already uses.",
  },
];

export default function AboutPage() {
  return (
    <>
      <main className="min-h-screen w-full overflow-x-hidden pt-28">
        {/* Hero */}
        <section className="relative py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="font-heading mb-6 text-4xl font-bold tracking-tight text-white md:text-6xl">
                Built for teams who care about{" "}
                <span className="brand-gradient-text">
                  trust, privacy, and real follow-up
                </span>
              </h1>
              <p className="text-xl leading-relaxed text-zinc-400">
                NextStop started with a simple question: why does every meeting
                copilot need live access to your microphone and a direct line to
                a cloud model? We believed there was a better way — local
                capture first, then structured AI only after the meeting ends.
              </p>
            </div>
          </div>
        </section>

        {/* Mission */}
        <section className="border-t border-white/5 py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-4xl">
              <div className="flex flex-col gap-12 md:flex-row">
                <div className="flex-1">
                  <h2 className="font-heading mb-4 text-3xl font-bold text-white">
                    Why NextStop exists
                  </h2>
                  <div className="space-y-4 text-lg leading-relaxed text-zinc-400">
                    <p>
                      Product teams, engineering managers, and operational leads
                      run meetings every day. The current generation of meeting
                      copilots asks users to stream their audio to the cloud in
                      real time and trust an opaque AI pipeline with no review
                      step.
                    </p>
                    <p>
                      NextStop takes a different approach: record locally, keep
                      participant context stable, and send only a finalized
                      meeting package to a gateway the user controls. The result
                      is summaries, action items, decisions, drafts, and
                      workspace sync — all reviewable, retryable, and grounded
                      in the user&apos;s trust model.
                    </p>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="rounded-2xl border border-white/8 bg-zinc-950/60 p-8">
                    <h3 className="font-heading mb-4 text-xl font-bold text-white">
                      Our principles
                    </h3>
                    <ul className="space-y-4 text-zinc-400">
                      <li className="flex gap-3">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--brand-primary)" }} />
                        Audio stays local. No live cloud streaming.
                      </li>
                      <li className="flex gap-3">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--brand-trust)" }} />
                        AI runs post-meeting, through a secure gateway.
                      </li>
                      <li className="flex gap-3">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--brand-support)" }} />
                        Users review, regenerate, and control every output.
                      </li>
                      <li className="flex gap-3">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--brand-highlight)" }} />
                        Meeting artifacts sync to the workspace, not a silo.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="border-t border-white/5 py-24">
          <div className="container mx-auto px-4 md:px-6">
            <h2 className="font-heading mb-12 text-center text-3xl font-bold text-white md:text-4xl">
              What drives the product
            </h2>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-3">
              {values.map((value) => (
                <div
                  key={value.title}
                  className="hover-border-gradient rounded-2xl border border-white/8 bg-zinc-950/60 p-8"
                >
                  <div
                    className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
                    style={{ background: "rgb(var(--brand-primary-rgb) / 0.12)" }}
                  >
                    {value.icon}
                  </div>
                  <h3 className="font-heading mb-3 text-xl font-bold text-white">
                    {value.title}
                  </h3>
                  <p className="leading-relaxed text-zinc-400">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Footer />
      </main>
    </>
  );
}

import { Footer } from "@/components/Footer";
import { CloudOff, FileText, Lock, Server, ShieldCheck } from "lucide-react";

const layers = [
  {
    icon: <CloudOff className="h-6 w-6" />,
    title: "Local capture zone",
    description:
      "Meeting audio is captured and stored locally on the user's device. The desktop app handles recording, transcript history, speaker identity, and session controls entirely within the local runtime.",
    color: "var(--brand-primary)",
    details: [
      "Mic and system audio never leave the laptop during the meeting",
      "Transcript history stored on desktop",
      "Session controls run locally in the HUD",
    ],
  },
  {
    icon: <Lock className="h-6 w-6" />,
    title: "Trust boundary",
    description:
      "When the meeting ends, the user's desktop app sends a finalized meeting package to the secure gateway. This is the only point where data crosses the trust boundary.",
    color: "var(--brand-trust)",
    details: [
      "Finalized meeting package, not live audio",
      "User-controlled timing — after meeting end only",
      "Package includes transcript, metadata, and tags",
    ],
  },
  {
    icon: <Server className="h-6 w-6" />,
    title: "Secure gateway",
    description:
      "The gateway holds the production AI credentials (e.g., OpenAI keys) server-side. It runs extraction, synthesis, memory lookup, and draft generation on the finalized package.",
    color: "var(--brand-highlight)",
    details: [
      "Production OpenAI keys stay server-side only",
      "AI pipeline: extraction → synthesis → memory → draft",
      "Policy-controlled: what runs, what's retained, what's exported",
    ],
  },
  {
    icon: <FileText className="h-6 w-6" />,
    title: "Structured return path",
    description:
      "The desktop app receives structured artifacts back: summaries, tasks, decisions, drafts, memory references, and canonical markdown. Users review, regenerate, and export from their local workspace.",
    color: "var(--brand-support)",
    details: [
      "Artifacts applied locally for review",
      "Targeted regeneration without rerunning the full pipeline",
      "Markdown, Notion, and workspace-ready export routes",
    ],
  },
];

const commitments = [
  {
    icon: <CloudOff className="h-5 w-5" />,
    text: "OpenAI is not used live during the meeting.",
  },
  {
    icon: <ShieldCheck className="h-5 w-5" />,
    text: "Production AI credentials never reach the desktop application.",
  },
  {
    icon: <Server className="h-5 w-5" />,
    text: "The secure gateway owns all AI credential and policy management.",
  },
  {
    icon: <FileText className="h-5 w-5" />,
    text: "Users can review, retry, and control every generated output.",
  },
];

export default function SecurityPage() {
  return (
    <>
      <main className="min-h-screen w-full overflow-x-hidden pt-28">
        {/* Hero */}
        <section className="py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <div
                className="mb-6 inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium"
                style={{
                  borderColor: "rgb(var(--brand-trust-rgb) / 0.3)",
                  background: "rgb(var(--brand-trust-rgb) / 0.1)",
                  color: "var(--brand-highlight)",
                }}
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                Trust & Security
              </div>
              <h1 className="font-heading mb-6 text-4xl font-bold tracking-tight text-white md:text-6xl">
                A trust model{" "}
                <span className="brand-gradient-text">users can understand</span>
              </h1>
              <p className="text-xl leading-relaxed text-zinc-400">
                NextStop separates meeting capture from AI processing with a
                clear, auditable boundary. Here is exactly how it works.
              </p>
            </div>
          </div>
        </section>

        {/* Security layers */}
        <section className="border-t border-white/5 py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-4xl">
              <h2 className="font-heading mb-12 text-center text-3xl font-bold text-white">
                Four-layer trust architecture
              </h2>

              <div className="space-y-6">
                {layers.map((layer, index) => (
                  <div
                    key={layer.title}
                    className="hover-border-gradient rounded-2xl border border-white/8 bg-zinc-950/60 p-8"
                  >
                    <div className="flex flex-col gap-6 md:flex-row">
                      <div className="flex-1">
                        <div className="mb-4 flex items-center gap-3">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-xl"
                            style={{
                              background: `color-mix(in srgb, ${layer.color} 18%, transparent)`,
                              color: layer.color,
                            }}
                          >
                            {layer.icon}
                          </div>
                          <span className="font-heading text-lg font-bold text-zinc-500">
                            Layer {index + 1}
                          </span>
                        </div>
                        <h3 className="font-heading mb-3 text-2xl font-bold text-white">
                          {layer.title}
                        </h3>
                        <p className="leading-relaxed text-zinc-400">{layer.description}</p>
                      </div>
                      <div className="flex-1">
                        <div className="space-y-3">
                          {layer.details.map((detail) => (
                            <div
                              key={detail}
                              className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3"
                            >
                              <span
                                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                                style={{ background: layer.color }}
                              />
                              <p className="text-sm text-zinc-300">{detail}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Commitments */}
        <section className="border-t border-white/5 py-24">
          <div className="container mx-auto px-4 md:px-6">
            <h2 className="font-heading mb-12 text-center text-3xl font-bold text-white">
              Our security commitments
            </h2>
            <div className="mx-auto grid max-w-4xl grid-cols-1 gap-5 md:grid-cols-2">
              {commitments.map((item) => (
                <div
                  key={item.text}
                  className="hover-border-gradient flex items-start gap-4 rounded-xl border border-white/6 bg-zinc-950/60 p-6"
                >
                  <div
                    className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      background: "rgb(var(--brand-trust-rgb) / 0.14)",
                      color: "var(--brand-highlight)",
                    }}
                  >
                    {item.icon}
                  </div>
                  <p className="text-sm leading-relaxed text-zinc-300">{item.text}</p>
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

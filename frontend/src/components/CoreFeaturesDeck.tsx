"use client";

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import {
  Cpu,
  Ear,
  LayoutTemplate,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import React, { useEffect, useMemo, useRef } from "react";

type FeatureCard = {
  number: string;
  eyebrow: string;
  title: string;
  description: string;
  chips: string[];
  accent: string;
  accentRgb: string;
  icon: React.ReactNode;
  previewTitle: string;
  preview: React.ReactNode;
};

const STACK_TUNING = {
  entryBufferVh: 54,
  exitBufferVh: 42,
  scrollVhPerCard: 86,
  entryOffsetPx: 160,
  layerGapPx: 22,
  scaleStep: 0.02,
  maxDepthLayers: 3,
  settleDelay: 0.12,
  entryTravel: 0.82,
  springStiffness: 150,
  springDamping: 30,
  springMass: 0.42,
} as const;

const featureCards: FeatureCard[] = [
  {
    number: "01",
    eyebrow: "Local-first runtime",
    title: "Local session engine",
    description:
      "Launch a structured session, capture on desktop, and keep the raw meeting context grounded on the machine before any post-meeting AI work begins.",
    chips: ["Local capture", "Speaker-aware", "Session control"],
    accent: "var(--brand-primary)",
    accentRgb: "var(--brand-primary-rgb)",
    icon: <Cpu className="h-5 w-5" />,
    previewTitle: "Session preflight",
    preview: (
      <div className="space-y-3">
        {[
          { label: "Type", value: "Instant Google Meet" },
          { label: "Tag", value: "Engineering" },
          { label: "Destination", value: "Launch Hub" },
          { label: "Auto-sync", value: "Enabled" },
        ].map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-4 rounded-2xl border border-white/6 bg-white/[0.03] px-4 py-3"
          >
            <span className="text-xs uppercase tracking-[0.16em] text-zinc-500">
              {row.label}
            </span>
            <span className="text-sm font-medium text-zinc-100">{row.value}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    number: "02",
    eyebrow: "Meeting context",
    title: "Participant identity",
    description:
      "Keep speakers stable through review and export so the transcript, summary, and follow-up all reference the same meeting reality.",
    chips: ["Resolved speakers", "Review-safe labels", "Consistent exports"],
    accent: "var(--brand-support)",
    accentRgb: "var(--brand-support-rgb)",
    icon: <Ear className="h-5 w-5" />,
    previewTitle: "Resolved transcript",
    preview: (
      <div className="space-y-3">
        {[
          {
            speaker: "You",
            text: "Let's lock the rollout window before Friday.",
            tone: "var(--brand-trust-rgb)",
          },
          {
            speaker: "Ravi",
            text: "I'll update the checklist and sync Support.",
            tone: "var(--brand-primary-rgb)",
          },
          {
            speaker: "Maya",
            text: "Keep the same labels in Notion and the final summary.",
            tone: "var(--brand-support-rgb)",
          },
        ].map((row) => (
          <div
            key={row.speaker}
            className="flex items-start gap-3 rounded-2xl border border-white/6 bg-white/[0.03] px-4 py-3"
          >
            <span
              className="mt-0.5 inline-flex min-w-[3.8rem] justify-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white"
              style={{ background: `rgb(${row.tone} / 0.28)` }}
            >
              {row.speaker}
            </span>
            <p className="text-sm leading-relaxed text-zinc-300">{row.text}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    number: "03",
    eyebrow: "Trust boundary",
    title: "Secure gateway boundary",
    description:
      "Run post-meeting AI through a controlled server boundary so the desktop app stays local-first while production AI credentials remain server-side.",
    chips: ["No live cloud stream", "Server-held keys", "Structured return path"],
    accent: "var(--brand-trust)",
    accentRgb: "var(--brand-trust-rgb)",
    icon: <ShieldCheck className="h-5 w-5" />,
    previewTitle: "Post-meeting route",
    preview: (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/6 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300">
          <span>Desktop app</span>
          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[rgb(var(--brand-trust-rgb)/0.65)] to-transparent" />
          <span>Secure gateway</span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/6 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300">
          <span>Finalized package</span>
          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[rgb(var(--brand-highlight-rgb)/0.65)] to-transparent" />
          <span>Structured outputs</span>
        </div>
        <div
          className="rounded-[1.4rem] border px-4 py-4 text-sm leading-relaxed text-slate-100"
          style={{
            borderColor: "rgb(var(--brand-trust-rgb) / 0.26)",
            background:
              "linear-gradient(135deg, rgb(var(--brand-trust-rgb) / 0.16), rgb(var(--brand-highlight-rgb) / 0.08))",
          }}
        >
          OpenAI is post-meeting only. The secure gateway owns policy, timing,
          and credentials.
        </div>
      </div>
    ),
  },
  {
    number: "04",
    eyebrow: "Reusable follow-up",
    title: "Canonical meeting artifact",
    description:
      "Generate one durable artifact that powers preview, retry, sync, and future exports instead of rebuilding the meeting follow-up from scratch.",
    chips: ["Markdown-first", "Retryable outputs", "Workspace-ready sync"],
    accent: "var(--brand-highlight)",
    accentRgb: "var(--brand-highlight-rgb)",
    icon: <LayoutTemplate className="h-5 w-5" />,
    previewTitle: "Artifact snapshot",
    preview: (
      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-2xl border border-white/6 bg-white/[0.03] px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-zinc-900 text-xs font-semibold text-zinc-300">
            MD
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-100">release-sync.md</p>
            <p className="text-xs text-zinc-500">
              Source of truth for preview, sync, and retry
            </p>
          </div>
        </div>
        <div className="rounded-[1.4rem] border border-white/6 bg-black/35 p-4 font-mono text-xs leading-6 text-zinc-400">
          <span style={{ color: "var(--brand-primary)" }}># Release readiness</span>
          <br />
          - Decision: shift rollout to Friday
          <br />
          - Action: update launch checklist
          <br />
          - Follow-up: sync Support and Security
        </div>
      </div>
    ),
  },
];

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function getSectionHeightVh(cardCount: number) {
  return (
    100 +
    STACK_TUNING.entryBufferVh +
    STACK_TUNING.exitBufferVh +
    (cardCount - 1) * STACK_TUNING.scrollVhPerCard
  );
}

function useSectionProgress(sectionRef: React.RefObject<HTMLDivElement | null>) {
  const rawProgress = useMotionValue(0);
  const smoothProgress = useSpring(rawProgress, {
    stiffness: STACK_TUNING.springStiffness,
    damping: STACK_TUNING.springDamping,
    mass: STACK_TUNING.springMass,
  });

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;

      const section = sectionRef.current;
      if (!section) {
        return;
      }

      const rect = section.getBoundingClientRect();
      const totalScrollable = Math.max(rect.height - window.innerHeight, 1);
      const nextProgress = clamp(-rect.top / totalScrollable);
      rawProgress.set(nextProgress);
    };

    const schedule = () => {
      if (frame !== 0) {
        return;
      }

      frame = window.requestAnimationFrame(update);
    };

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [rawProgress, sectionRef]);

  return smoothProgress;
}

function DesktopFeatureCard({
  card,
  index,
  cardCount,
  progress,
  progressStart,
  progressEnd,
}: {
  card: FeatureCard;
  index: number;
  cardCount: number;
  progress: MotionValue<number>;
  progressStart: number;
  progressEnd: number;
}) {
  const contentProgress = useTransform(progress, (value) =>
    clamp((value - progressStart) / Math.max(progressEnd - progressStart, 0.0001))
  );
  const activeStep = useTransform(contentProgress, [0, 1], [0, cardCount - 1]);

  const enter = useTransform(activeStep, (value) => {
    if (index === 0) {
      return 1;
    }
    const start = index - 1 + STACK_TUNING.settleDelay;
    return clamp((value - start) / STACK_TUNING.entryTravel);
  });

  const depth = useTransform(activeStep, (value) => Math.max(0, value - index));

  const y = useTransform([activeStep, enter], ([value, enterValue]: number[]) => {
    const depthValue = Math.max(0, value - index);
    const pinnedOffset =
      Math.min(depthValue, STACK_TUNING.maxDepthLayers) * STACK_TUNING.layerGapPx;
    const entryOffset = (1 - enterValue) * STACK_TUNING.entryOffsetPx;
    return entryOffset + pinnedOffset;
  });

  const scale = useTransform(depth, (depthValue) => {
    return 1 - Math.min(depthValue, STACK_TUNING.maxDepthLayers) * STACK_TUNING.scaleStep;
  });

  /** Cards start invisible and fade in smoothly; older cards dim as they get covered */
  const opacity = useTransform([enter, depth], ([enterValue, depthValue]: number[]) => {
    if (index === 0 && depthValue === 0) return 1;
    // Fade in over first 40% of entry
    const entryOpacity = index === 0 ? 1 : clamp(enterValue / 0.4);
    // Dim cards that are buried under newer cards
    const depthDim = 1 - Math.min(depthValue, STACK_TUNING.maxDepthLayers) * 0.15;
    return entryOpacity * Math.max(0.4, depthDim);
  });

  const shadowStrength = useTransform(depth, (depthValue) => {
    const focus = 1 - Math.min(depthValue, 1);
    return 0.2 + focus * 0.22;
  });

  const borderStrength = useTransform(depth, (depthValue) => {
    const focus = 1 - Math.min(depthValue, 1);
    return 0.18 + focus * 0.16;
  });

  const boxShadow = useTransform(
    shadowStrength,
    (value) =>
      `0 28px 84px -44px rgb(${card.accentRgb} / ${value}), inset 0 1px 0 rgb(255 255 255 / 0.05)`
  );

  const borderColor = useTransform(
    borderStrength,
    (value) => `rgb(${card.accentRgb} / ${value})`
  );

  return (
    <motion.article
      className="absolute inset-x-0 top-0 mx-auto w-full max-w-[1180px]"
      style={{
        y,
        scale,
        opacity,
        zIndex: cardCount + index,
      }}
    >
      <motion.div
        className="flex h-[28rem] flex-col overflow-hidden rounded-[2rem] border bg-[rgb(7,7,10)] md:h-[30rem] lg:h-[32rem]"
        style={{ borderColor, boxShadow }}
      >
        <div className="grid h-full gap-8 p-6 md:grid-cols-[0.95fr_1.05fr] md:p-8">
          <div className="flex h-full flex-col justify-between gap-8">
            <div>
              <div className="mb-5 flex items-center gap-4">
                <span className="font-heading text-5xl font-semibold text-zinc-800">
                  {card.number}
                </span>
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border"
                  style={{
                    color: card.accent,
                    borderColor: `rgb(${card.accentRgb} / 0.28)`,
                    background: `rgb(${card.accentRgb} / 0.12)`,
                  }}
                >
                  {card.icon}
                </div>
              </div>

              <p className="mb-3 text-xs uppercase tracking-[0.24em] text-zinc-500">
                {card.eyebrow}
              </p>
              <h3 className="font-heading mb-4 max-w-md text-3xl font-semibold tracking-tight text-white md:text-[2.2rem]">
                {card.title}
              </h3>
              <p className="max-w-xl text-lg leading-relaxed text-zinc-300">
                {card.description}
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {card.chips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border px-3 py-1.5 text-xs font-medium text-zinc-200"
                  style={{
                    borderColor: `rgb(${card.accentRgb} / 0.2)`,
                    background: `rgb(${card.accentRgb} / 0.08)`,
                  }}
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>

          <div className="flex h-full flex-col overflow-hidden rounded-[1.8rem] border border-white/8 bg-black/30">
            <div className="flex h-12 items-center gap-2 border-b border-white/6 bg-[#17181c] px-4">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                <div className="h-3 w-3 rounded-full bg-green-500/80" />
              </div>
              <span className="ml-auto text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                {card.previewTitle}
              </span>
            </div>
            <div className="flex-1 p-5 md:p-6">{card.preview}</div>
          </div>
        </div>
      </motion.div>
    </motion.article>
  );
}

function MobileFeatureCard({ card }: { card: FeatureCard }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="overflow-hidden rounded-[1.8rem] border bg-[linear-gradient(180deg,rgba(13,13,16,0.95),rgba(7,7,10,0.92))]"
      style={{
        borderColor: `rgb(${card.accentRgb} / 0.2)`,
        boxShadow: `0 18px 60px -42px rgb(${card.accentRgb} / 0.45)`,
      }}
    >
      <div className="p-5">
        <div className="mb-5 flex items-center gap-4">
          <span className="font-heading text-4xl font-semibold text-zinc-800">
            {card.number}
          </span>
          <div
            className="flex h-11 w-11 items-center justify-center rounded-2xl border"
            style={{
              color: card.accent,
              borderColor: `rgb(${card.accentRgb} / 0.28)`,
              background: `rgb(${card.accentRgb} / 0.12)`,
            }}
          >
            {card.icon}
          </div>
        </div>

        <p className="mb-3 text-[11px] uppercase tracking-[0.22em] text-zinc-500">
          {card.eyebrow}
        </p>
        <h3 className="font-heading mb-3 text-2xl font-semibold text-white">
          {card.title}
        </h3>
        <p className="mb-5 text-base leading-relaxed text-zinc-300">
          {card.description}
        </p>
        <div className="mb-5 flex flex-wrap gap-2">
          {card.chips.map((chip) => (
            <span
              key={chip}
              className="rounded-full border px-3 py-1.5 text-xs font-medium text-zinc-200"
              style={{
                borderColor: `rgb(${card.accentRgb} / 0.2)`,
                background: `rgb(${card.accentRgb} / 0.08)`,
              }}
            >
              {chip}
            </span>
          ))}
        </div>
      </div>

      <div className="border-t border-white/6 bg-black/26 px-5 py-4">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
          </div>
          <span className="ml-auto text-[10px] uppercase tracking-[0.22em] text-zinc-500">
            {card.previewTitle}
          </span>
        </div>
        {card.preview}
      </div>
    </motion.article>
  );
}

function DeckHeading({ sticky = false }: { sticky?: boolean }) {
  return (
    <div
      className={`mx-auto max-w-3xl text-center ${sticky ? "mb-6 md:mb-8" : "mb-14"}`}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="brand-chip mb-4 inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium"
      >
        <Sparkles className="mr-2 h-4 w-4" />
        Core features
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="font-heading text-3xl font-semibold tracking-tight text-white md:text-5xl"
      >
        Four capabilities that make the workflow feel complete
      </motion.h2>
    </div>
  );
}

export function CoreFeaturesDeck() {
  const shouldReduceMotion = useReducedMotion();
  const stickySectionRef = useRef<HTMLDivElement>(null);
  const progress = useSectionProgress(stickySectionRef);
  const sectionHeightVh = useMemo(
    () => getSectionHeightVh(featureCards.length),
    []
  );

  const progressStart = STACK_TUNING.entryBufferVh / sectionHeightVh;
  const progressEnd = 1 - STACK_TUNING.exitBufferVh / sectionHeightVh;

  return (
    <section
      id="core-features"
      className="relative bg-transparent py-14"
    >
      <div className="container relative z-10 mx-auto px-4 md:px-6">
        <div className={`${shouldReduceMotion ? "block" : "md:hidden"}`}>
          <DeckHeading />
        </div>

        {!shouldReduceMotion && (
          <div
            ref={stickySectionRef}
            className="relative hidden md:block"
            style={{ height: `${sectionHeightVh}vh` }}
          >
            <div className="sticky top-0 h-screen">
              <div className="mx-auto flex h-full max-w-[1240px] flex-col justify-start px-2 pb-[3vh] pt-[5vh] md:px-4 lg:px-0">
                <DeckHeading sticky />
                <div className="flex flex-1 items-start justify-center">
                  <div className="relative h-[34rem] w-full max-w-[1180px] overflow-visible">
                  {featureCards.map((card, index) => (
                    <DesktopFeatureCard
                      key={card.title}
                      card={card}
                      cardCount={featureCards.length}
                      index={index}
                      progress={progress}
                      progressEnd={progressEnd}
                      progressStart={progressStart}
                    />
                  ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div
          className={`grid gap-6 ${
            shouldReduceMotion ? "md:grid-cols-2" : "md:hidden"
          }`}
        >
          {featureCards.map((card) => (
            <MobileFeatureCard key={card.title} card={card} />
          ))}
        </div>
      </div>
    </section>
  );
}

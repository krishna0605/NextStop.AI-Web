import React from "react";

const testimonials = [
  {
    quote:
      "The session launcher fixed our old 'start recording and clean it up later' habit. We now set the title, tag, and Notion destination before anyone joins.",
    name: "Maya Patel",
    role: "Product Operations Lead",
  },
  {
    quote:
      "What sold me was the review flow. If the draft is weak, I regenerate just the draft instead of rerunning the whole meeting.",
    name: "Ethan Brooks",
    role: "Engineering Manager",
  },
  {
    quote:
      "The Google Meet path is exactly what we needed. I can create the event, open the call, and still keep the local recording flow under one roof.",
    name: "Nadia Khan",
    role: "Program Lead",
  },
  {
    quote:
      "The related-meeting memory finally ties our recurring release calls together. The summary knows what was decided last week.",
    name: "Jordan Lee",
    role: "Technical Program Manager",
  },
  {
    quote:
      "Canonical markdown plus Notion sync means I always have a clean page, a local artifact, and a retry path if anything fails.",
    name: "Rhea Menon",
    role: "Knowledge Systems Lead",
  },
];

const marqueeItems = [...testimonials, ...testimonials];

export function Testimonials() {
  return (
    <section id="testimonials" className="relative overflow-hidden bg-transparent py-24">
      <div className="container relative z-10 mx-auto mb-16 px-4 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading mb-4 text-3xl font-bold text-white md:text-5xl">
            Built for product, engineering, and ops teams
          </h2>
          <p className="text-lg text-zinc-400">
            Teams use NextStop to launch sessions faster, keep the review
            process clear, and move follow-up into the right workspace without
            rebuilding every summary by hand.
          </p>
        </div>
      </div>

      <div className="group relative overflow-hidden py-4">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#060709] to-transparent md:w-32" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#060709] to-transparent md:w-32" />

        <div className="testimonial-marquee-track flex w-max gap-6 pr-6">
          {marqueeItems.map((item, index) => (
            <TestimonialCard key={`${item.name}-${index}`} item={item} />
          ))}
        </div>

        <div className="testimonial-marquee-track testimonial-marquee-track-reverse mt-6 hidden w-max gap-6 pr-6 lg:flex">
          {marqueeItems.map((item, index) => (
            <TestimonialCard key={`${item.role}-${index}`} item={item} compact />
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialCard({
  item,
  compact = false,
}: {
  item: (typeof testimonials)[0];
  compact?: boolean;
}) {
  return (
    <div
      className={`brand-card-hover hover-border-gradient shrink-0 rounded-2xl border border-white/10 bg-zinc-900/55 ${
        compact ? "w-[320px] p-6" : "w-[360px] p-8 md:w-[420px]"
      }`}
      style={{ "--card-accent-rgb": "232 169 88" } as React.CSSProperties}
    >
      <div className="mb-4 flex gap-1">
        {[...Array(5)].map((_, i) => (
          <svg
            key={i}
            className="h-5 w-5"
            style={{ color: "var(--brand-highlight)" }}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <p className={`leading-relaxed text-zinc-300 ${compact ? "mb-5 text-base" : "mb-6 text-lg"}`}>
        &ldquo;{item.quote}&rdquo;
      </p>
      <div className="flex items-center gap-4">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-black"
          style={{
            backgroundImage:
              "linear-gradient(135deg, var(--brand-primary), var(--brand-highlight))",
          }}
        >
          {item.name.charAt(0)}
        </div>
        <div>
          <h4 className="font-semibold text-white">{item.name}</h4>
          <p className="text-sm text-zinc-500">{item.role}</p>
        </div>
      </div>
    </div>
  );
}

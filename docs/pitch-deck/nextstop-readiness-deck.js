const pptxgen = require("pptxgenjs");
const { warnIfSlideHasOverlaps, warnIfSlideElementsOutOfBounds } = require("./pptxgenjs_helpers/layout");
const { safeOuterShadow } = require("./pptxgenjs_helpers/util");
const { svgToDataUri } = require("./pptxgenjs_helpers/svg");

const pptx = new pptxgen();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "OpenAI Codex";
pptx.company = "NextStop";
pptx.subject = "NextStop Post-Production Readiness";
pptx.title = "NextStop Readiness Pitch Deck";
pptx.lang = "en-US";
pptx.theme = {
  headFontFace: "Segoe UI",
  bodyFontFace: "Segoe UI",
  lang: "en-US",
};

const C = {
  bg: "090B10",
  bgAlt: "0E121A",
  card: "111722",
  cardSoft: "161C28",
  border: "232B39",
  text: "F5F7FB",
  muted: "9AA4B6",
  muted2: "647089",
  amber: "FFB347",
  amber2: "F59E0B",
  cyan: "5EEAD4",
  blue: "67A9FF",
  green: "34D399",
  red: "FB7185",
  white: "FFFFFF",
};

function addBackground(slide, accent = C.amber) {
  slide.background = { color: C.bg };
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 13.333,
    h: 7.5,
    line: { color: C.bg },
    fill: { color: C.bg },
  });

  slide.addShape(pptx.ShapeType.ellipse, {
    x: 8.9,
    y: -0.9,
    w: 3.7,
    h: 3.7,
    line: { color: accent, transparency: 100 },
    fill: { color: accent, transparency: 78 },
  });
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 10.2,
    y: 4.8,
    w: 2.7,
    h: 2.7,
    line: { color: C.blue, transparency: 100 },
    fill: { color: C.blue, transparency: 84 },
  });
  slide.addShape(pptx.ShapeType.ellipse, {
    x: -0.8,
    y: 5.6,
    w: 2.8,
    h: 2.8,
    line: { color: C.cyan, transparency: 100 },
    fill: { color: C.cyan, transparency: 88 },
  });

  for (let i = 0; i < 12; i++) {
    slide.addShape(pptx.ShapeType.line, {
      x: 0.7 + i * 1.0,
      y: 0.55,
      w: 0,
      h: 6.2,
      line: { color: C.border, transparency: 72, width: 0.3 },
    });
  }
  for (let i = 0; i < 7; i++) {
    slide.addShape(pptx.ShapeType.line, {
      x: 0.55,
      y: 0.75 + i * 0.9,
      w: 12.1,
      h: 0,
      line: { color: C.border, transparency: 80, width: 0.3 },
    });
  }
}

function addHeader(slide, eyebrow, title, subtitle, opts = {}) {
  const x = opts.x ?? 0.72;
  const y = opts.y ?? 0.62;
  const width = opts.w ?? 6.8;
  slide.addText(eyebrow.toUpperCase(), {
    x,
    y,
    w: width,
    h: 0.28,
    fontFace: "Segoe UI",
    fontSize: 11,
    bold: false,
    charSpace: 2.3,
    color: C.amber,
    margin: 0,
  });
  slide.addText(title, {
    x,
    y: y + 0.28,
    w: width,
    h: 0.88,
    fontFace: "Segoe UI",
    fontSize: opts.titleSize ?? 25,
    bold: true,
    color: C.text,
    margin: 0,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x,
      y: y + 1.08,
      w: width + 0.7,
      h: 0.75,
      fontFace: "Segoe UI",
      fontSize: 11.5,
      color: C.muted,
      breakLine: false,
      margin: 0,
      valign: "top",
    });
  }
}

function addFooter(slide, label = "NextStop readiness deck") {
  slide.addText(label, {
    x: 0.72,
    y: 7.08,
    w: 3.0,
    h: 0.22,
    fontFace: "Segoe UI",
    fontSize: 8.5,
    color: C.muted2,
    margin: 0,
  });
  slide.addText("April 2026", {
    x: 11.75,
    y: 7.08,
    w: 0.85,
    h: 0.22,
    fontFace: "Segoe UI",
    fontSize: 8.5,
    color: C.muted2,
    align: "right",
    margin: 0,
  });
}

function addPill(slide, text, x, y, w, fill, color = C.text) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w,
    h: 0.34,
    rectRadius: 0.1,
    line: { color: fill, transparency: 100 },
    fill: { color: fill, transparency: 12 },
  });
  slide.addText(text, {
    x,
    y: y + 0.05,
    w,
    h: 0.2,
    fontFace: "Segoe UI",
    fontSize: 9,
    color,
    align: "center",
    bold: true,
    margin: 0,
  });
}

function addCard(slide, x, y, w, h, opts = {}) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w,
    h,
    rectRadius: 0.12,
    line: { color: opts.border ?? C.border, width: 1 },
    fill: { color: opts.fill ?? C.card },
    shadow: safeOuterShadow("000000", 0.22, 45, 2, 1),
  });
}

function addMetricCard(slide, { x, y, w, h, label, value, caption, accent }) {
  addCard(slide, x, y, w, h, { fill: C.cardSoft, border: C.border });
  slide.addText(label.toUpperCase(), {
    x: x + 0.28,
    y: y + 0.22,
    w: w - 0.56,
    h: 0.2,
    fontFace: "Segoe UI",
    fontSize: 9.5,
    charSpace: 1.8,
    color: C.muted2,
    margin: 0,
  });
  slide.addText(value, {
    x: x + 0.26,
    y: y + 0.48,
    w: w - 0.56,
    h: 0.7,
    fontFace: "Segoe UI",
    fontSize: 28,
    bold: true,
    color: accent,
    margin: 0,
  });
  slide.addText(caption, {
    x: x + 0.28,
    y: y + h - 0.58,
    w: w - 0.56,
    h: 0.36,
    fontFace: "Segoe UI",
    fontSize: 10.5,
    color: C.muted,
    margin: 0,
    valign: "top",
  });
}

function addBulletBlock(slide, { x, y, w, title, bullets, accent = C.text }) {
  slide.addText(title, {
    x,
    y,
    w,
    h: 0.26,
    fontFace: "Segoe UI",
    fontSize: 12.5,
    bold: true,
    color: accent,
    margin: 0,
  });
  const runs = [];
  bullets.forEach((bullet) => {
    runs.push({
      text: bullet,
      options: {
        bullet: { indent: 12 },
        breakLine: true,
      },
    });
  });
  slide.addText(runs, {
    x,
    y: y + 0.28,
    w,
    h: 1.55,
    fontFace: "Segoe UI",
    fontSize: 11,
    color: C.muted,
    breakLine: false,
    margin: 0,
    paraSpaceAfterPt: 10,
    valign: "top",
  });
}

function addMiniFeatureCard(slide, { x, y, w, h, title, status, note, tone }) {
  addCard(slide, x, y, w, h, { fill: C.card, border: C.border });
  addPill(slide, status, x + 0.18, y + 0.16, 1.28, tone, C.text);
  slide.addText(title, {
    x: x + 0.2,
    y: y + 0.58,
    w: w - 0.4,
    h: 0.34,
    fontFace: "Segoe UI",
    fontSize: 12,
    bold: true,
    color: C.text,
    margin: 0,
  });
  slide.addText(note, {
    x: x + 0.2,
    y: y + 0.94,
    w: w - 0.4,
    h: h - 1.08,
    fontFace: "Segoe UI",
    fontSize: 9.8,
    color: C.muted,
    margin: 0,
    valign: "top",
  });
}

function boxSvg({ width = 1000, height = 420, nodes = [], links = [], title = "" }) {
  const linkSvg = links
    .map((link) => {
      const from = nodes.find((n) => n.id === link.from);
      const to = nodes.find((n) => n.id === link.to);
      if (!from || !to) return "";
      const x1 = from.x + from.w;
      const y1 = from.y + from.h / 2;
      const x2 = to.x;
      const y2 = to.y + to.h / 2;
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${link.color || "#5d6c88"}" stroke-width="3" stroke-linecap="round"/><polygon points="${x2 - 10},${y2 - 6} ${x2},${y2} ${x2 - 10},${y2 + 6}" fill="${link.color || "#5d6c88"}"/>`;
    })
    .join("");

  const nodeSvg = nodes
    .map(
      (n) => `
      <rect x="${n.x}" y="${n.y}" rx="22" ry="22" width="${n.w}" height="${n.h}" fill="${n.fill}" stroke="${n.stroke}" stroke-width="2"/>
      <text x="${n.x + 18}" y="${n.y + 34}" fill="#f5f7fb" font-family="Segoe UI" font-weight="700" font-size="20">${n.label}</text>
      <text x="${n.x + 18}" y="${n.y + 60}" fill="#93a0b8" font-family="Segoe UI" font-size="13">${n.note}</text>
    `
    )
    .join("");

  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" rx="28" fill="#0f141d"/>
    <text x="34" y="38" fill="#ffb347" font-family="Segoe UI" font-size="14" letter-spacing="3">${title.toUpperCase()}</text>
    ${linkSvg}
    ${nodeSvg}
  </svg>`;
}

function finalize(slide) {
  const start = typeof slide._validationStartIndex === "number" ? slide._validationStartIndex : 0;
  const targetSlide =
    start > 0
      ? {
          _slideObjects: slide._slideObjects.slice(start),
        }
      : slide;
  if (process.env.VALIDATE_SLIDES === "1") {
    warnIfSlideHasOverlaps(targetSlide, pptx, {
      muteContainment: true,
      ignoreDecorativeShapes: true,
      ignoreLines: true,
    });
    warnIfSlideElementsOutOfBounds(targetSlide, pptx);
  }
}

function markValidationStart(slide) {
  slide._validationStartIndex = slide._slideObjects.length;
}

// Slide 1: Cover
{
  const slide = pptx.addSlide();
  addBackground(slide, C.amber);
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.68,
    y: 0.58,
    w: 2.2,
    h: 0.42,
    rectRadius: 0.12,
    line: { color: C.border, transparency: 100 },
    fill: { color: C.white, transparency: 92 },
  });
  slide.addText("POST-PRODUCTION READINESS", {
    x: 0.88,
    y: 0.69,
    w: 1.8,
    h: 0.14,
    fontFace: "Segoe UI",
    fontSize: 8.5,
    bold: true,
    charSpace: 1.8,
    color: C.amber,
    margin: 0,
    align: "center",
  });
  slide.addText("NextStop\nReadiness Deck", {
    x: 0.72,
    y: 1.4,
    w: 5.8,
    h: 1.7,
    fontFace: "Segoe UI",
    fontSize: 28,
    bold: true,
    color: C.text,
    margin: 0,
    breakLine: false,
    valign: "mid",
  });
  slide.addText("Live production status, local release readiness, and the highest-impact hardening moves for the next 60 days.", {
    x: 0.74,
    y: 3.36,
    w: 5.4,
    h: 0.9,
    fontFace: "Segoe UI",
    fontSize: 12.5,
    color: C.muted,
    margin: 0,
    valign: "top",
  });
  addPill(slide, "Vercel + Railway + Supabase", 0.74, 4.48, 2.55, C.blue);
  addPill(slide, "April 2026", 3.46, 4.48, 1.25, C.amber2);
  addPill(slide, "Founder / operator version", 4.84, 4.48, 2.2, C.cyan);
  markValidationStart(slide);

  addCard(slide, 7.55, 1.1, 4.95, 4.95, { fill: "0F141D", border: "222A38" });
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 8.2,
    y: 1.62,
    w: 3.6,
    h: 3.6,
    line: { color: C.amber, transparency: 62, width: 1.5 },
    fill: { color: C.amber, transparency: 92 },
  });
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 8.72,
    y: 2.14,
    w: 2.56,
    h: 2.56,
    line: { color: C.cyan, transparency: 68, width: 1.2 },
    fill: { color: C.cyan, transparency: 92 },
  });
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 9.38,
    y: 2.8,
    w: 1.24,
    h: 1.24,
    line: { color: C.white, transparency: 100 },
    fill: { color: C.white, transparency: 15 },
  });
  slide.addText("Ship now.\nHarden next.", {
    x: 8.05,
    y: 5.35,
    w: 3.7,
    h: 0.6,
    fontFace: "Segoe UI",
    fontSize: 18,
    bold: true,
    color: C.text,
    align: "center",
    margin: 0,
  });
  slide.addText("Readiness is no longer about whether the product exists. It is about operational clarity, recoverability, and confidence.", {
    x: 8.1,
    y: 5.92,
    w: 3.6,
    h: 0.64,
    fontFace: "Segoe UI",
    fontSize: 10.3,
    color: C.muted,
    align: "center",
    margin: 0,
  });
  addFooter(slide, "NextStop readiness deck");
  finalize(slide);
}

// Slide 2: Snapshot
{
  const slide = pptx.addSlide();
  addBackground(slide, C.blue);
  addHeader(
    slide,
    "Executive Snapshot",
    "Two truths define the current release",
    "The live product is real and usable. The local branch is materially stronger and should be the next production push."
  );
  markValidationStart(slide);
  addMetricCard(slide, {
    x: 0.78,
    y: 2.05,
    w: 2.7,
    h: 1.85,
    label: "Live Production",
    value: "3.5 / 5",
    caption: "Stable for controlled production, but still needs operational hardening.",
    accent: C.amber,
  });
  addMetricCard(slide, {
    x: 3.74,
    y: 2.05,
    w: 2.7,
    h: 1.85,
    label: "Next Release Ready",
    value: "4.1 / 5",
    caption: "Strong release candidate with better visibility, export telemetry, and post-deploy verification.",
    accent: C.green,
  });
  addCard(slide, 6.75, 2.05, 5.76, 1.85, { fill: C.cardSoft });
  addTextBlock(
    slide,
    7.04,
    2.32,
    5.2,
    0.28,
    "What changed the most",
    13,
    true,
    C.text
  );
  addBulletBlock(slide, {
    x: 7.04,
    y: 2.66,
    w: 5.0,
    title: "",
    bullets: [
      "Railway now clearly owns heavy AI execution instead of bouncing jobs back through Vercel.",
      "The new ops surface gives a fast, in-app answer to whether production is healthy.",
      "Export actions now have real failure and duration telemetry instead of black-box behavior.",
    ],
  });

  addCard(slide, 0.78, 4.36, 11.72, 1.88, { fill: C.card });
  addTextBlock(slide, 1.06, 4.66, 2.2, 0.24, "Immediate focus", 12.5, true, C.amber);
  addPill(slide, "Push local release", 1.06, 5.1, 1.6, C.amber2);
  addPill(slide, "Verify production automatically", 2.84, 5.1, 2.3, C.blue);
  addPill(slide, "Add alerts + retries", 5.34, 5.1, 1.85, C.red);
  addPill(slide, "Tighten runtime ownership", 7.4, 5.1, 2.2, C.cyan);
  addPill(slide, "Build onboarding + export center", 9.82, 5.1, 2.2, C.green);
  addFooter(slide);
  finalize(slide);
}

function addTextBlock(slide, x, y, w, h, text, size, bold = false, color = C.text, opts = {}) {
  slide.addText(text, {
    x,
    y,
    w,
    h,
    fontFace: "Segoe UI",
    fontSize: size,
    bold,
    color,
    margin: 0,
    align: opts.align || "left",
    valign: opts.valign || "mid",
    breakLine: false,
  });
}

// Slide 3: Architecture
{
  const slide = pptx.addSlide();
  addBackground(slide, C.cyan);
  addHeader(
    slide,
    "System Architecture",
    "The runtime split is finally directionally correct",
    "Vercel renders the user experience, Railway handles heavy AI work, and Supabase remains the durable system of record."
  );
  markValidationStart(slide);

  const svg = boxSvg({
    width: 1000,
    height: 360,
    title: "Runtime map",
    nodes: [
      { id: "browser", x: 38, y: 110, w: 170, h: 88, label: "User Browser", note: "capture, library, review", fill: "#121925", stroke: "#2a3344" },
      { id: "vercel", x: 272, y: 86, w: 210, h: 94, label: "Vercel / Next.js", note: "UI + auth-aware orchestration", fill: "#151d2a", stroke: "#4562a6" },
      { id: "railway", x: 548, y: 86, w: 210, h: 94, label: "Railway AI Core", note: "worker + queue execution", fill: "#151d2a", stroke: "#f59e0b" },
      { id: "supabase", x: 548, y: 214, w: 210, h: 94, label: "Supabase", note: "auth, DB, storage", fill: "#151d2a", stroke: "#33d39c" },
      { id: "providers", x: 822, y: 110, w: 140, h: 88, label: "Providers", note: "Deepgram, OpenAI", fill: "#121925", stroke: "#2a3344" }
    ],
    links: [
      { from: "browser", to: "vercel", color: "#63748f" },
      { from: "vercel", to: "railway", color: "#f59e0b" },
      { from: "vercel", to: "supabase", color: "#34d399" },
      { from: "railway", to: "providers", color: "#67a9ff" },
      { from: "railway", to: "supabase", color: "#34d399" }
    ]
  });
  slide.addImage({ data: svgToDataUri(svg), x: 0.82, y: 1.92, w: 8.9, h: 3.2 });

  addCard(slide, 10.02, 1.92, 2.45, 1.32, { fill: C.cardSoft });
  addTextBlock(slide, 10.28, 2.18, 1.9, 0.22, "What still lives on Vercel", 11.3, true, C.amber);
  slide.addText([
    { text: "• Authenticated Next.js API routes\n", options: {} },
    { text: "• Readiness aggregation\n", options: {} },
    { text: "• Lightweight export orchestration", options: {} },
  ], {
    x: 10.28, y: 2.5, w: 1.9, h: 0.62, fontFace: "Segoe UI", fontSize: 9.6, color: C.muted, margin: 0
  });

  addCard(slide, 10.02, 3.42, 2.45, 1.7, { fill: C.cardSoft });
  addTextBlock(slide, 10.28, 3.68, 1.9, 0.22, "Why this matters", 11.3, true, C.cyan);
  slide.addText([
    { text: "• Direct execution reduces latency ambiguity\n", options: {} },
    { text: "• Failure ownership is clearer\n", options: {} },
    { text: "• The remaining boundary debt is visible and manageable", options: {} },
  ], {
    x: 10.28, y: 4.0, w: 1.92, h: 0.82, fontFace: "Segoe UI", fontSize: 9.6, color: C.muted, margin: 0
  });
  addFooter(slide);
  finalize(slide);
}

// Slide 4: Feature stack
{
  const slide = pptx.addSlide();
  addBackground(slide, C.green);
  addHeader(
    slide,
    "Product Surface Audit",
    "Core product value is already broad and real",
    "The remaining work is less about adding existence and more about improving trust, speed, and operability."
  );
  markValidationStart(slide);
  const cards = [
    ["Auth + Access", "LIVE", "Billing-aware access and gated dashboard entry are already in place.", C.green],
    ["Capture Controls", "LIVE", "Static sidebar controls are cleaner and more predictable than the old floating rail.", C.amber2],
    ["Library", "LIVE", "The library now has lighter loading and a clearer meeting-card contract.", C.blue],
    ["Review + Exports", "LIVE", "Review is more output-first, and export actions now have better telemetry.", C.cyan],
    ["Google", "LIVE", "Google scheduling and workspace connection are usable, with reconnect still a watch area.", C.green],
    ["Notion", "LIVE", "Notion export is functional, but destination and OAuth recovery remain important.", C.amber2],
    ["AI Pipeline", "LIVE", "Heavy execution now belongs on Railway with richer status tracking.", C.red],
    ["Ops Console", "LOCAL", "The new readiness dashboard is prepared locally and should ship next.", C.blue],
  ];
  let index = 0;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      const item = cards[index++];
      addMiniFeatureCard(slide, {
        x: 0.78 + col * 3.05,
        y: 2.0 + row * 2.15,
        w: 2.72,
        h: 1.78,
        title: item[0],
        status: item[1],
        note: item[2],
        tone: item[3],
      });
    }
  }
  addFooter(slide);
  finalize(slide);
}

// Slide 5: Risks + hardening
{
  const slide = pptx.addSlide();
  addBackground(slide, C.red);
  addHeader(
    slide,
    "Risk Landscape",
    "The remaining issues are operational, not existential",
    "That is a good place to be. The app works. The next step is making failure states visible, actionable, and boring."
  );
  markValidationStart(slide);
  const risks = [
    ["Split ownership", "Important authenticated logic still lives in Next.js API routes."],
    ["Recovery tooling", "Operators can see failures, but cannot fully resolve them in-app yet."],
    ["Post-deploy timing", "Verification depends on correct envs and live deployment timing."],
    ["Export recovery", "Exports now log failures, but retry tooling is still thin."],
    ["Alerting maturity", "Visibility is improving faster than proactive notification."],
  ];
  risks.forEach((risk, i) => {
    addCard(slide, 0.82, 1.92 + i * 0.86, 5.2, 0.66, { fill: C.cardSoft });
    addPill(slide, `RISK ${i + 1}`, 1.03, 2.08 + i * 0.86, 0.78, C.red);
    addTextBlock(slide, 1.98, 2.03 + i * 0.86, 1.48, 0.18, risk[0], 11.4, true, C.text);
    addTextBlock(slide, 3.42, 2.03 + i * 0.86, 2.35, 0.24, risk[1], 9.6, false, C.muted, { valign: "top" });
  });

  addCard(slide, 6.4, 1.92, 5.1, 4.54, { fill: C.card });
  addTextBlock(slide, 6.72, 2.16, 2.2, 0.26, "Hardening moves", 13, true, C.amber);
  addBulletBlock(slide, {
    x: 6.72,
    y: 2.5,
    w: 4.45,
    title: "",
    bullets: [
      "Push the local ops and telemetry release before starting new feature work.",
      "Add worker-heartbeat, queue-backlog, and repeated-failure alerting immediately after release.",
      "Build retry paths for failed AI jobs and failed exports so support does not require raw DB access.",
      "Continue moving backend-worthy endpoints off Vercel to make failure domains clearer.",
    ],
  });
  addPill(slide, "Ship now", 6.74, 5.72, 1.08, C.green);
  addPill(slide, "Watch closely", 7.96, 5.72, 1.38, C.amber2);
  addPill(slide, "Automate recovery", 9.5, 5.72, 1.72, C.blue);
  addFooter(slide);
  finalize(slide);
}

// Slide 6: Ops console
{
  const slide = pptx.addSlide();
  addBackground(slide, C.blue);
  addHeader(
    slide,
    "Operational Command Center",
    "The next release adds a real readiness surface",
    "This is one of the most important maturity upgrades in the branch: it gives an operator a fast answer to whether the system is healthy."
  );
  markValidationStart(slide);
  addCard(slide, 0.88, 1.98, 11.45, 4.82, { fill: "0E131C", border: C.border });
  addTextBlock(slide, 1.18, 2.18, 2.4, 0.24, "Production readiness", 16, true, C.text);
  addPill(slide, "Frontend healthy", 1.18, 2.58, 1.42, C.green);
  addPill(slide, "Backend healthy", 2.76, 2.58, 1.42, C.green);
  addPill(slide, "Worker healthy", 4.34, 2.58, 1.36, C.green);
  addPill(slide, "Queue: 3 waiting", 5.86, 2.58, 1.5, C.amber2);
  addPill(slide, "Last deploy: passed", 7.52, 2.58, 1.78, C.blue);

  addCard(slide, 1.18, 3.18, 4.95, 2.92, { fill: C.cardSoft });
  addTextBlock(slide, 1.42, 3.42, 2.1, 0.22, "Recent AI failures", 12.3, true, C.amber);
  addTextBlock(slide, 1.44, 3.8, 4.2, 0.18, "Meeting ID", 9.2, true, C.muted2);
  addTextBlock(slide, 3.0, 3.8, 1.0, 0.18, "Stage", 9.2, true, C.muted2);
  addTextBlock(slide, 4.1, 3.8, 1.5, 0.18, "Error", 9.2, true, C.muted2);
  slide.addShape(pptx.ShapeType.line, { x: 1.42, y: 4.08, w: 4.25, h: 0, line: { color: C.border, width: 1 } });
  addTextBlock(slide, 1.44, 4.24, 1.28, 0.18, "91e...", 10.4, true, C.text);
  addTextBlock(slide, 3.0, 4.24, 0.9, 0.18, "transcribe", 10.2, false, C.muted);
  addTextBlock(slide, 4.1, 4.24, 1.35, 0.36, "empty transcript", 10.2, false, C.muted);
  addTextBlock(slide, 1.44, 4.86, 1.28, 0.18, "a12...", 10.4, true, C.text);
  addTextBlock(slide, 3.0, 4.86, 0.9, 0.18, "analyze", 10.2, false, C.muted);
  addTextBlock(slide, 4.1, 4.86, 1.35, 0.36, "timeout while generating findings", 10.2, false, C.muted);

  addCard(slide, 6.4, 3.18, 5.18, 2.92, { fill: C.cardSoft });
  addTextBlock(slide, 6.64, 3.42, 2.3, 0.22, "Runtime boundary + export failures", 12.3, true, C.cyan);
  addTextBlock(slide, 6.66, 3.84, 1.3, 0.18, "App URL", 9.2, true, C.muted2);
  addTextBlock(slide, 7.9, 3.84, 3.15, 0.18, "next-stop-ai-web.vercel.app", 9.8, false, C.text);
  addTextBlock(slide, 6.66, 4.22, 1.3, 0.18, "AI core", 9.2, true, C.muted2);
  addTextBlock(slide, 7.9, 4.22, 2.95, 0.18, "Railway direct execution healthy", 9.8, false, C.text);
  slide.addShape(pptx.ShapeType.line, { x: 6.66, y: 4.52, w: 4.32, h: 0, line: { color: C.border, width: 1 } });
  addTextBlock(slide, 6.66, 4.68, 1.2, 0.18, "PDF export", 10.4, true, C.text);
  addTextBlock(slide, 7.92, 4.68, 2.4, 0.18, "timeout · 1842 ms", 10.2, false, C.muted);
  addTextBlock(slide, 6.66, 5.1, 1.2, 0.18, "Notion export", 10.4, true, C.text);
  addTextBlock(slide, 7.92, 5.1, 2.4, 0.18, "destination missing", 10.2, false, C.muted);
  addFooter(slide);
  finalize(slide);
}

// Slide 7: Release pipeline
{
  const slide = pptx.addSlide();
  addBackground(slide, C.amber2);
  addHeader(
    slide,
    "Release Safety",
    "CI and post-deploy verification are now credible",
    "The release process is not enterprise-grade, but it is disciplined enough for the current stage and much stronger than before."
  );
  markValidationStart(slide);
  const pipelineSvg = boxSvg({
    width: 1040,
    height: 250,
    title: "Delivery flow",
    nodes: [
      { id: "push", x: 28, y: 84, w: 120, h: 72, label: "GitHub push", note: "PR or main", fill: "#121925", stroke: "#2a3344" },
      { id: "ci", x: 188, y: 84, w: 140, h: 72, label: "CI", note: "typecheck, lint, build", fill: "#151d2a", stroke: "#67a9ff" },
      { id: "sec", x: 368, y: 84, w: 140, h: 72, label: "Security", note: "audit, gitleaks, CodeQL", fill: "#151d2a", stroke: "#34d399" },
      { id: "dep", x: 548, y: 84, w: 145, h: 72, label: "Deploy", note: "Vercel + Railway", fill: "#151d2a", stroke: "#ffb347" },
      { id: "verify", x: 732, y: 84, w: 150, h: 72, label: "Verify", note: "readiness + smoke", fill: "#151d2a", stroke: "#5eead4" },
      { id: "ready", x: 920, y: 84, w: 96, h: 72, label: "Healthy", note: "release", fill: "#121925", stroke: "#2a3344" },
    ],
    links: [
      { from: "push", to: "ci", color: "#63748f" },
      { from: "ci", to: "sec", color: "#63748f" },
      { from: "sec", to: "dep", color: "#63748f" },
      { from: "dep", to: "verify", color: "#63748f" },
      { from: "verify", to: "ready", color: "#34d399" },
    ]
  });
  slide.addImage({ data: svgToDataUri(pipelineSvg), x: 0.82, y: 1.95, w: 11.7, h: 2.65 });

  addCard(slide, 0.82, 4.95, 3.75, 1.25, { fill: C.cardSoft });
  addTextBlock(slide, 1.08, 5.18, 2.6, 0.2, "Already strong", 12, true, C.green);
  slide.addText("CI + security + deployed verification now form a coherent release story.", {
    x: 1.08, y: 5.48, w: 3.0, h: 0.42, fontFace: "Segoe UI", fontSize: 10.2, color: C.muted, margin: 0
  });

  addCard(slide, 4.8, 4.95, 3.75, 1.25, { fill: C.cardSoft });
  addTextBlock(slide, 5.06, 5.18, 2.6, 0.2, "Still manual", 12, true, C.amber);
  slide.addText("Rollback and some deeper production assertions still need stronger automation.", {
    x: 5.06, y: 5.48, w: 3.0, h: 0.42, fontFace: "Segoe UI", fontSize: 10.2, color: C.muted, margin: 0
  });

  addCard(slide, 8.78, 4.95, 3.54, 1.25, { fill: C.cardSoft });
  addTextBlock(slide, 9.04, 5.18, 2.3, 0.2, "Validated locally", 12, true, C.cyan);
  slide.addText("frontend typecheck, lint, coverage, build, and backend typecheck all passed.", {
    x: 9.04, y: 5.48, w: 2.84, h: 0.42, fontFace: "Segoe UI", fontSize: 10.2, color: C.muted, margin: 0
  });
  addFooter(slide);
  finalize(slide);
}

// Slide 8: Roadmap
{
  const slide = pptx.addSlide();
  addBackground(slide, C.cyan);
  addHeader(
    slide,
    "Roadmap",
    "Ship the release, then harden the machine",
    "The right sequence is release first, instrumentation second, structural cleanup third, and larger product growth after the operating layer feels boring."
  );
  markValidationStart(slide);
  const cols = [
    { x: 0.82, w: 2.85, title: "Next release", tone: C.green, items: ["Ship /dashboard/ops", "Ship export telemetry", "Ship post-deploy verify", "Ship runtime docs + runbook"] },
    { x: 3.98, w: 2.85, title: "Next 2 weeks", tone: C.amber2, items: ["Add alerts", "Add AI/export retries", "Verify live retention policy", "Run structured production smoke"] },
    { x: 7.14, w: 2.85, title: "30-60 days", tone: C.blue, items: ["Move more backend routes to Railway", "Create export center", "Add onboarding checklist", "Build timing dashboard"] },
    { x: 10.3, w: 2.2, title: "Later", tone: C.cyan, items: ["Searchable intelligence", "Admin + collaboration", "AI eval set", "Possible backend consolidation"] },
  ];
  cols.forEach((col) => {
    addCard(slide, col.x, 2.02, col.w, 4.5, { fill: C.cardSoft });
    addTextBlock(slide, col.x + 0.22, 2.24, col.w - 0.44, 0.2, col.title, 13, true, col.tone);
    col.items.forEach((item, idx) => {
      slide.addShape(pptx.ShapeType.ellipse, {
        x: col.x + 0.24,
        y: 2.7 + idx * 0.78,
        w: 0.13,
        h: 0.13,
        line: { color: col.tone, transparency: 100 },
        fill: { color: col.tone },
      });
      addTextBlock(slide, col.x + 0.46, 2.63 + idx * 0.78, col.w - 0.62, 0.32, item, 10.3, false, C.muted, { valign: "top" });
    });
  });
  addFooter(slide);
  finalize(slide);
}

// Slide 9: Closing
{
  const slide = pptx.addSlide();
  addBackground(slide, C.amber);
  addHeader(
    slide,
    "Recommendation",
    "Push the release. Then make operations boring.",
    "The product is ready enough to move forward. The most important next wins are not new product surfaces, but clearer ownership, faster recovery, and better production visibility."
  );
  markValidationStart(slide);
  addCard(slide, 0.82, 2.05, 7.0, 3.65, { fill: C.cardSoft });
  addTextBlock(slide, 1.14, 2.36, 2.8, 0.24, "Three immediate decisions", 14, true, C.text);
  addBulletBlock(slide, {
    x: 1.14,
    y: 2.74,
    w: 6.2,
    title: "",
    bullets: [
      "Release the already-prepared local branch rather than holding it for more redesign work.",
      "Use the new post-deploy verification path as the gate for confidence, not intuition.",
      "Invest the next cycle in ops maturity, retries, alerts, and runtime cleanup before broad feature expansion.",
    ],
  });
  addCard(slide, 8.12, 2.05, 4.18, 3.65, { fill: C.card });
  slide.addText("Ship now\nHardening next\nScale later", {
    x: 8.5,
    y: 2.5,
    w: 3.4,
    h: 1.1,
    fontFace: "Segoe UI",
    fontSize: 24,
    bold: true,
    color: C.text,
    align: "center",
    margin: 0,
  });
  addPill(slide, "Controlled production: yes", 8.62, 4.1, 2.9, C.green);
  addPill(slide, "Broad production: not yet", 8.62, 4.58, 2.9, C.red);
  addFooter(slide);
  finalize(slide);
}

// Build
(async () => {
  const out = "NextStop-Readiness-Pitch-Deck.pptx";
  await pptx.writeFile({ fileName: out });
  console.log(`Wrote ${out}`);
})();

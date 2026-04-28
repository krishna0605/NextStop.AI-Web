export type PricingPlan = {
  name: "Starter" | "Pro Workflow" | "Team";
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  popular: boolean;
  features: string[];
  limitations: string[];
  cta: string;
};

export const pricingPlans: PricingPlan[] = [
  {
    name: "Starter",
    description: "For solo users validating the workflow via our web dashboard.",
    monthlyPrice: 0,
    yearlyPrice: 0,
    popular: false,
    features: [
      "Full Web Dashboard access",
      "Manual upload & transcript generation",
      "Post-meeting summary, highlights, and tasks",
      "Simple review mode",
    ],
    limitations: ["No Desktop App", "No local auto-recording", "No Advanced mode toggle"],
    cta: "Open Web App",
  },
  {
    name: "Pro Workflow",
    description: "For operators. Unlocks the Desktop App for local capture and advanced AI.",
    monthlyPrice: 29,
    yearlyPrice: 19,
    popular: true,
    features: [
      "Everything in Starter",
      "Desktop App for local, secure recording",
      "Advanced mode toggle for deeper meeting controls",
      "Google Calendar and Meet creation",
      "Notion page-first sync plus markdown preview",
      "Related-meeting memory and targeted regeneration",
    ],
    limitations: [],
    cta: "Download Desktop App",
  },
  {
    name: "Team",
    description: "For teams standardizing meeting capture and follow-up.",
    monthlyPrice: 99,
    yearlyPrice: 79,
    popular: false,
    features: [
      "Desktop App for every seat",
      "Advanced mode for every seat",
      "Shared workflow defaults and tags",
      "Workspace-ready sync and routing support",
      "Priority onboarding and support",
    ],
    limitations: [],
    cta: "Contact Sales",
  },
];

export const pricingFeatureMatrix = [
  { feature: "Session launcher", starter: true, pro: true, team: true },
  { feature: "Manual upload", starter: true, pro: true, team: true },
  { feature: "Desktop local recording", starter: false, pro: true, team: true },
  { feature: "Post-meeting AI", starter: true, pro: true, team: true },
  { feature: "Simple review mode", starter: true, pro: true, team: true },
  { feature: "Advanced mode", starter: false, pro: true, team: true },
  { feature: "Google Calendar sync", starter: false, pro: true, team: true },
  { feature: "Notion page-first sync", starter: false, pro: true, team: true },
  { feature: "Related-meeting memory", starter: false, pro: true, team: true },
  { feature: "Targeted regeneration", starter: false, pro: true, team: true },
  { feature: "Shared workflow defaults", starter: false, pro: false, team: true },
  { feature: "Multi-seat management", starter: false, pro: false, team: true },
  { feature: "Priority support", starter: false, pro: false, team: true },
];

export const pricingFaqs = [
  {
    q: "Can I use NextStop for free?",
    a: "Yes. The Starter plan gives you the full session launcher, local recording, and basic post-meeting AI at no cost. Upgrade when you need Advanced mode, workspace sync, or related-meeting memory.",
  },
  {
    q: "What does 'related-meeting memory' mean?",
    a: "Pro and Team plans can recall context from past meetings during post-meeting analysis. This enriches summaries, surfaces recurring decisions, and connects action items across multiple sessions.",
  },
  {
    q: "Is there a free trial for Pro?",
    a: "Pro Workflow includes a 14-day free trial with full access to all features. No credit card required to start.",
  },
  {
    q: "How does Team billing work?",
    a: "The Team plan covers 5 seats. Additional seats can be added at a per-seat rate. Contact sales for custom sizing and volume pricing.",
  },
];

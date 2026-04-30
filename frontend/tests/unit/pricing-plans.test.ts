import {
  pricingFaqs,
  pricingFeatureMatrix,
  pricingPlans,
} from "@/lib/pricing-plans";
import { PLAN_DETAILS, SELF_SERVE_PLAN_CODE } from "@/lib/billing";

describe("pricing plan claims", () => {
  it("keeps the public pricing plans aligned to the expected launch catalog", () => {
    expect(pricingPlans.map((plan) => plan.name)).toEqual([
      "Starter",
      "Pro Workflow",
      "Team",
    ]);
    expect(pricingPlans.every((plan) => plan.cta.length > 0)).toBe(true);
    expect(pricingPlans.every((plan) => plan.features.length > 0)).toBe(true);
    expect(pricingPlans.every((plan) => plan.trustNotes.length > 0)).toBe(true);
    expect(pricingFaqs.length).toBeGreaterThanOrEqual(4);
    expect(pricingFaqs[0].a).not.toMatch(/local recording/i);
  });

  it("does not claim desktop-only capabilities for the Starter plan", () => {
    const desktopLocalRecording = pricingFeatureMatrix.find(
      (row) => row.feature === "Desktop local recording"
    );
    const advancedMode = pricingFeatureMatrix.find((row) => row.feature === "Advanced mode");
    const starter = pricingPlans.find((plan) => plan.name === "Starter");

    expect(desktopLocalRecording).toEqual(
      expect.objectContaining({ starter: false, pro: true, team: true })
    );
    expect(advancedMode).toEqual(expect.objectContaining({ starter: false }));
    expect(starter?.limitations).toEqual(
      expect.arrayContaining(["No Desktop App", "No local auto-recording"])
    );
  });

  it("keeps paid public plan names aligned with runtime billing entitlements", () => {
    const pro = pricingPlans.find((plan) => plan.name === "Pro Workflow");
    const team = pricingPlans.find((plan) => plan.name === "Team");

    expect(SELF_SERVE_PLAN_CODE).toBe("pro_monthly");
    expect(PLAN_DETAILS[SELF_SERVE_PLAN_CODE].label).toBe("Pro Workflow");
    expect(pro?.features).toEqual(
      expect.arrayContaining([
        "Desktop App for local, secure recording",
        "Notion page-first sync plus markdown preview",
        "Related-meeting memory and targeted regeneration",
      ])
    );
    expect(team?.features).toEqual(
      expect.arrayContaining([
        "Desktop App for every seat",
        "Priority onboarding and support",
      ])
    );
  });
});

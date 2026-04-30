import {
  isSafeAppPath,
  isUuid,
  parsePlanCode,
  parsePositiveInteger,
  parseSafeNextPath,
} from "@/lib/route-validation";
import { sanitizeNextPath } from "@/lib/billing";

describe("route validation helpers", () => {
  it("accepts app-relative redirect paths and rejects open redirect candidates", () => {
    expect(isSafeAppPath("/dashboard")).toBe(true);
    expect(isSafeAppPath("/dashboard?tab=billing")).toBe(true);
    expect(isSafeAppPath("https://evil.example")).toBe(false);
    expect(isSafeAppPath("//evil.example")).toBe(false);
    expect(isSafeAppPath("/%2Fevil.example")).toBe(false);
    expect(isSafeAppPath("/dashboard%0d%0aSet-Cookie:bad=1")).toBe(false);
    expect(parseSafeNextPath("https://evil.example", "/dashboard")).toBe("/dashboard");
    expect(sanitizeNextPath("//evil.example", "/dashboard")).toBe("/dashboard");
    expect(sanitizeNextPath("/%2Fevil.example", "/dashboard")).toBe("/dashboard");
  });

  it("validates high-risk primitive route fields", () => {
    expect(isUuid("3fa85f64-5717-4562-b3fc-2c963f66afa6")).toBe(true);
    expect(isUuid("meeting-1")).toBe(false);
    expect(parsePlanCode("pro_monthly")).toEqual({ ok: true, value: "pro_monthly" });
    expect(parsePlanCode("enterprise")).toEqual({
      ok: false,
      error: "Unsupported plan selection.",
    });
    expect(parsePositiveInteger("12", "limit", 50)).toEqual({ ok: true, value: 12 });
    expect(parsePositiveInteger("500", "limit", 50).ok).toBe(false);
  });
});

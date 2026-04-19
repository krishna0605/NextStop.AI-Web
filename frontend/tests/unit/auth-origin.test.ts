import { getBrowserAuthOrigin, normalizeAuthOrigin } from "@/lib/auth-origin";

describe("auth origin normalization", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("normalizes 0.0.0.0 to localhost", () => {
    expect(normalizeAuthOrigin("http://0.0.0.0:3000")).toBe("http://localhost:3000");
  });

  it("leaves regular origins unchanged", () => {
    expect(normalizeAuthOrigin("https://next-stop-ai-web.vercel.app")).toBe(
      "https://next-stop-ai-web.vercel.app"
    );
  });

  it("uses the normalized browser origin for client redirects", () => {
    vi.stubGlobal("window", {
      location: {
        origin: "http://0.0.0.0:3000",
      },
    });

    expect(getBrowserAuthOrigin()).toBe("http://localhost:3000");
  });
});

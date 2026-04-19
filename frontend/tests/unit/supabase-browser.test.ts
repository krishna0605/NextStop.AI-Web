import { resolveBrowserSupabaseUrl } from "@/lib/supabase-browser";

describe("supabase browser client url", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("uses the configured Supabase project URL in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubGlobal("window", {
      location: {
        origin: "http://localhost:3000",
      },
    });

    expect(resolveBrowserSupabaseUrl()).toBe("https://example.supabase.co");
  });

  it("throws when the public Supabase URL is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");

    expect(() => resolveBrowserSupabaseUrl()).toThrow(
      "NEXT_PUBLIC_SUPABASE_URL is not configured."
    );
  });
});

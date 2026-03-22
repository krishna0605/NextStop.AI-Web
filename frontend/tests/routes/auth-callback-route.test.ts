import { GET } from "@/app/auth/callback/route";

describe("GET /auth/callback", () => {
  it("redirects provider failures back to the Notion dashboard with provider details", async () => {
    const request = new Request(
      "https://nextstop.ai/auth/callback?error=server_error&error_code=unexpected_failure&error_description=Unable+to+exchange+external+code&intent=connect-notion&next=%2Fdashboard%2Fnotion"
    );

    const response = await GET(request);
    const location = response.headers.get("location");

    expect(response.status).toBe(307);
    expect(location).toContain("/dashboard/notion");
    expect(location).toContain("oauth_error=server_error");
    expect(location).toContain("oauth_error_code=unexpected_failure");
  });
});

import { NextResponse } from "next/server";

import {
  exchangeNotionAuthorizationCode,
  getNotionAppUrl,
  upsertNotionConnection,
  verifyNotionState,
} from "@/lib/notion-workspace";

function buildDashboardRedirect(request: Request, params?: Record<string, string>) {
  const redirectUrl = new URL("/dashboard/notion", getNotionAppUrl(new URL(request.url).origin));

  Object.entries(params ?? {}).forEach(([key, value]) => {
    redirectUrl.searchParams.set(key, value);
  });

  return NextResponse.redirect(redirectUrl);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (error) {
    return buildDashboardRedirect(request, {
      integration_error: error,
      integration_error_description: errorDescription ?? "Notion authorization failed.",
    });
  }

  if (!code || !state) {
    return buildDashboardRedirect(request, {
      integration_error: "invalid_callback",
      integration_error_description: "Missing Notion authorization code or state.",
    });
  }

  try {
    const payload = verifyNotionState<{
      userId: string;
      redirectUri?: string;
      issuedAt?: number;
    }>(state);
    const token = await exchangeNotionAuthorizationCode(
      code,
      payload.redirectUri || new URL(request.url).toString()
    );

    await upsertNotionConnection({
      userId: payload.userId,
      token,
    });

    return buildDashboardRedirect(request, { connected: "1" });
  } catch (caughtError) {
    const message =
      caughtError instanceof Error
        ? caughtError.message
        : "Unable to complete the Notion workspace connection.";

    return buildDashboardRedirect(request, {
      integration_error: "callback_failed",
      integration_error_description: message,
    });
  }
}

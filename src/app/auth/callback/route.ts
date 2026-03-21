import { sanitizeNextPath } from "@/lib/billing";
import { createAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

type OAuthProvider = "google" | "notion";

function buildProviderErrorRedirect(
  origin: string,
  intent: string | null,
  next: string,
  searchParams: URLSearchParams
) {
  const providerTarget =
    intent === "connect-google"
      ? "/dashboard/google"
      : intent === "connect-notion"
        ? "/dashboard/notion"
        : next;

  const redirectUrl = new URL(providerTarget, origin);
  const error = searchParams.get("error");
  const errorCode = searchParams.get("error_code");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    redirectUrl.searchParams.set("oauth_error", error);
  }

  if (errorCode) {
    redirectUrl.searchParams.set("oauth_error_code", errorCode);
  }

  if (errorDescription) {
    redirectUrl.searchParams.set("oauth_error_description", errorDescription);
  }

  return redirectUrl;
}

function getIdentityDetails(user: {
  email?: string | null;
  identities?: Array<{
    provider?: string | null;
    identity_data?: Record<string, unknown> | null;
  }> | null;
}) {
  const identities = user.identities ?? [];

  return {
    google: identities.find((identity) => identity.provider === "google") ?? null,
    notion: identities.find((identity) => identity.provider === "notion") ?? null,
    fallbackEmail: user.email ?? null,
  };
}

async function syncIntegrationFromCallback(
  provider: OAuthProvider,
  user: {
    id: string;
    email?: string | null;
    identities?: Array<{
      provider?: string | null;
      identity_data?: Record<string, unknown> | null;
    }> | null;
  },
  session: {
    provider_token?: string | null;
    provider_refresh_token?: string | null;
  } | null
) {
  const admin = createAdminClient();
  const { google, notion, fallbackEmail } = getIdentityDetails(user);

  if (provider === "google") {
    const identityData = google?.identity_data ?? {};
    await admin.from("integrations_google").upsert({
      user_id: user.id,
      status: "connected",
      external_account_email:
        typeof identityData.email === "string" ? identityData.email : fallbackEmail,
      metadata: {
        provider: "google",
        provider_access_token: session?.provider_token ?? null,
        provider_refresh_token: session?.provider_refresh_token ?? null,
        connected_via: "auth_callback",
      },
      connected_at: new Date().toISOString(),
    });
    return;
  }

  const identityData = notion?.identity_data ?? {};
  await admin.from("integrations_notion").upsert({
    user_id: user.id,
    status: "connected",
    external_workspace_name:
      typeof identityData.workspace_name === "string"
        ? identityData.workspace_name
        : typeof identityData.name === "string"
          ? identityData.name
          : "Connected workspace",
    metadata: {
      provider: "notion",
      provider_token_available: Boolean(session?.provider_token),
      provider_refresh_token_available: Boolean(session?.provider_refresh_token),
      connected_via: "auth_callback",
    },
    connected_at: new Date().toISOString(),
  });
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeNextPath(searchParams.get("next"), "/app-entry");
  const intent = searchParams.get("intent");
  const providerError = searchParams.get("error");

  if (providerError) {
    return NextResponse.redirect(buildProviderErrorRedirect(origin, intent, next, searchParams));
  }

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const integrationProvider =
        intent === "connect-google"
          ? "google"
          : intent === "connect-notion"
            ? "notion"
            : null;

      if (integrationProvider && data.user) {
        try {
          await syncIntegrationFromCallback(integrationProvider, data.user, data.session);
        } catch (syncError) {
          console.warn("[workspace] Unable to sync integration during auth callback", syncError);
        }
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";
      const redirectTarget =
        integrationProvider === "google"
          ? "/dashboard/google?connected=1"
          : integrationProvider === "notion"
            ? "/dashboard/notion?connected=1"
            : next;

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${redirectTarget}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${redirectTarget}`);
      } else {
        return NextResponse.redirect(`${origin}${redirectTarget}`);
      }
    }
  }

  // If no code or error, redirect to login with error message
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}

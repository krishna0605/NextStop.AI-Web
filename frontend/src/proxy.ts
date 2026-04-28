import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabasePublicUrl } from "@/lib/env";
import { validateTrustedMutationOrigin } from "@/lib/trusted-origin";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const ORIGIN_GUARD_EXEMPT_PATHS = [
  "/api/razorpay/webhook",
  "/api/internal/ai/",
  "/api/workspace/notion/callback",
];

function isOriginGuardExempt(pathname: string) {
  return ORIGIN_GUARD_EXEMPT_PATHS.some((path) =>
    path.endsWith("/") ? pathname.startsWith(path) : pathname === path
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api/") &&
    MUTATION_METHODS.has(request.method.toUpperCase()) &&
    !isOriginGuardExempt(pathname)
  ) {
    const origin = validateTrustedMutationOrigin(request);

    if (!origin.trusted) {
      return NextResponse.json(
        {
          error: "Untrusted request origin.",
          code: "untrusted_origin",
        },
        { status: 403 }
      );
    }
  }

  const supabaseUrl = getSupabasePublicUrl();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPage =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/signup") ||
    request.nextUrl.pathname.startsWith("/forgot-password");

  const isDashboardPage = request.nextUrl.pathname.startsWith("/dashboard");
  const isPlansPage = request.nextUrl.pathname.startsWith("/plans");
  const isAppEntryPage = request.nextUrl.pathname.startsWith("/app-entry");
  const currentPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/app-entry";
    const next = request.nextUrl.searchParams.get("next");
    if (next) {
      url.searchParams.set("next", next);
    }
    return NextResponse.redirect(url);
  }

  if (!user && (isDashboardPage || isPlansPage || isAppEntryPage)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", currentPath);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|brand|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

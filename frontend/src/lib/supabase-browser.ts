import { createBrowserClient } from "@supabase/ssr";

export function resolveBrowserSupabaseUrl() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured.");
  }

  return supabaseUrl;
}

export function createClient() {
  return createBrowserClient(
    resolveBrowserSupabaseUrl(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

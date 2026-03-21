"use client";

import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Calendar,
  FolderOpen,
  NotebookTabs,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { BrandLogo } from "@/components/BrandLogo";
import { WorkspaceCaptureIsland } from "@/components/workspace/WorkspaceCaptureIsland";
import type { ProfileRecord } from "@/lib/billing";
import { createClient } from "@/lib/supabase-browser";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/library", label: "Library", icon: FolderOpen },
  { href: "/dashboard/google", label: "Google", icon: Calendar },
  { href: "/dashboard/notion", label: "Notion", icon: NotebookTabs },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardShell({
  user,
  profile,
  children,
}: {
  user: User;
  profile: ProfileRecord | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const displayName =
    profile?.full_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "User";

  const avatarUrl =
    profile?.avatar_url ||
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    null;

  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-black">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/8 bg-zinc-950/80 backdrop-blur-xl"
      >
        {/* Logo */}
        <div className="flex h-16 items-center px-6">
          <Link href="/">
            <span className="brand-logo-glow block">
              <BrandLogo className="w-[140px]" />
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "text-white"
                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                }`}
                style={
                  isActive
                    ? {
                        background:
                          "linear-gradient(135deg, rgb(var(--brand-primary-rgb) / 0.15), rgb(var(--brand-trust-rgb) / 0.1))",
                        boxShadow:
                          "0 0 24px -16px rgb(var(--brand-primary-rgb) / 0.6)",
                        borderColor: "rgb(var(--brand-primary-rgb) / 0.2)",
                      }
                    : undefined
                }
              >
                <item.icon
                  className="h-5 w-5"
                  style={
                    isActive
                      ? { color: "var(--brand-primary)" }
                      : undefined
                  }
                />
                {item.label}
                {isActive && (
                  <ChevronRight
                    className="ml-auto h-4 w-4"
                    style={{ color: "var(--brand-primary)" }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-white/8 p-4">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={displayName}
                width={36}
                height={36}
                unoptimized
                className="h-9 w-9 rounded-full border border-white/10 object-cover"
              />
            ) : (
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-xs font-bold"
                style={{
                  background:
                    "linear-gradient(135deg, rgb(var(--brand-primary-rgb) / 0.3), rgb(var(--brand-trust-rgb) / 0.2))",
                  color: "var(--brand-highlight)",
                }}
              >
                {initials}
              </div>
            )}
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-white">
                {displayName}
              </p>
              <p className="truncate text-xs text-zinc-500">{user.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-300"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main content */}
      <main className="ml-64 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-8 pb-40">{children}</div>
      </main>

      <WorkspaceCaptureIsland />
    </div>
  );
}

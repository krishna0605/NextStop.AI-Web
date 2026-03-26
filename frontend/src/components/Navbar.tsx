"use client";

import { Button } from "@heroui/react";
import { motion } from "framer-motion";
import { User as UserIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase-browser";
import { useToast } from "./ui/ActionToast";

import { BrandLogo } from "./BrandLogo";

const navLinks = [
  { href: "/features", label: "Features" },
  { href: "/about", label: "About" },
  { href: "/how-it-works", label: "How it Works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/security", label: "Security" },
];

export function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [supabase] = useState(() => createClient());
  const auth = supabase.auth;
  const pathname = usePathname();
  const showToast = useToast();

  useEffect(() => {
    auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const {
      data: { subscription },
    } = auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [auth]);

  function handleDownload() {
    showToast("Download link copied! Check your clipboard.");
  }

  return (
    <div className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6">
      <motion.nav
        initial={{ y: -28, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="navbar-capsule relative mx-auto flex h-16 w-full max-w-7xl items-center justify-between rounded-full px-5 shadow-[0_12px_40px_-28px_rgba(0,0,0,0.9)] supports-[backdrop-filter]:bg-black/62"
      >
        <Link href="/" className="flex items-center">
          <span className="brand-logo-glow block">
            <BrandLogo priority className="w-[152px] sm:w-[176px]" />
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`brand-link relative text-sm font-medium transition-colors ${
                  isActive ? "text-white" : "text-zinc-400"
                }`}
              >
                {link.label}
                {isActive && (
                  <motion.span
                    layoutId="navbar-active"
                    className="absolute -bottom-1 left-0 right-0 h-[2px] rounded-full"
                    style={{
                      backgroundImage:
                        "linear-gradient(90deg, var(--brand-primary), var(--brand-highlight))",
                    }}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <Link
              href="/app-entry"
              className="flex items-center gap-2"
            >
              <Button
                radius="full"
                className="brand-button-primary button-shine h-10 px-5 font-semibold"
                startContent={<UserIcon className="h-4 w-4" />}
              >
                Open App
              </Button>
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="brand-link hidden text-sm font-medium text-zinc-300 sm:block"
              >
                Log in
              </Link>
              <Button
                radius="full"
                className="brand-button-primary button-shine h-10 px-5 font-semibold"
                onPress={handleDownload}
              >
                Download App
              </Button>
            </>
          )}
        </div>
      </motion.nav>
    </div>
  );
}

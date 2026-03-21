"use client";

import { Button } from "@heroui/react";
import { motion } from "framer-motion";
import { Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { BrandLogo } from "@/components/BrandLogo";
import { createClient } from "@/lib/supabase-browser";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative w-full max-w-md"
    >
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/80 p-8 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:p-10">
        {/* Top accent line */}
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background:
              "linear-gradient(to right, transparent, rgb(var(--brand-primary-rgb) / 0.6), rgb(var(--brand-highlight-rgb) / 0.4), transparent)",
          }}
        />

        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Link href="/">
            <span className="brand-logo-glow block">
              <BrandLogo className="w-[160px]" />
            </span>
          </Link>
        </div>

        {success ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-green-500/20 bg-green-500/10">
              <Mail className="h-8 w-8 text-green-400" />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-white">
              Check your email
            </h1>
            <p className="mb-6 text-sm text-zinc-400">
              We&apos;ve sent a password reset link to{" "}
              <span className="font-medium text-zinc-200">{email}</span>
            </p>
            <Link
              href="/login"
              className="brand-link inline-flex items-center gap-2 text-sm font-medium text-zinc-300"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8 text-center">
              <h1 className="mb-2 text-2xl font-bold text-white">
                Reset your password
              </h1>
              <p className="text-sm text-zinc-400">
                Enter your email and we&apos;ll send you a link to reset your
                password.
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleReset} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 w-full rounded-xl border border-white/10 bg-zinc-900/60 pl-11 pr-4 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-[rgb(var(--brand-primary-rgb)/0.5)] focus:ring-1 focus:ring-[rgb(var(--brand-primary-rgb)/0.3)]"
                />
              </div>

              <Button
                type="submit"
                isLoading={loading}
                radius="full"
                className="brand-button-primary h-12 w-full text-sm font-semibold"
              >
                Send reset link
              </Button>
            </form>

            <p className="mt-6 text-center">
              <Link
                href="/login"
                className="brand-link inline-flex items-center gap-2 text-sm font-medium text-zinc-400"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </motion.div>
  );
}

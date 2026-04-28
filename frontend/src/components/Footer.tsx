import Link from "next/link";

import { BrandLogo } from "./BrandLogo";

export function Footer() {
  return (
    <footer className="bg-transparent pt-10 pb-6">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mb-16 grid gap-10 md:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr]">
          <div className="max-w-md">
            <Link
              href="/"
              className="brand-logo-glow mb-6 inline-flex"
            >
              <BrandLogo />
            </Link>
            <p className="mb-6 max-w-sm text-zinc-400">
              Meeting intelligence across desktop and web — local capture, secure
              post-meeting AI, and workspace-ready exports for teams that need a
              cleaner operational flow.
            </p>
            <p className="text-sm text-zinc-500">
              Local-first capture, secure AI after the meeting, and one durable
              artifact for the rest of the workflow.
            </p>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-white">Product</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/" className="brand-link text-zinc-400">
                  Overview
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="brand-link text-zinc-400">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/security" className="brand-link text-zinc-400">
                  Security
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="brand-link text-zinc-400">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-white">Company</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/about" className="brand-link text-zinc-400">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="brand-link text-zinc-400">
                  Plans
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-white">Legal</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/privacy" className="brand-link text-zinc-400">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="brand-link text-zinc-400">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="brand-link text-zinc-400">
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 md:flex-row">
          <p className="text-sm text-zinc-500">&copy; 2026 NextStop, Inc. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

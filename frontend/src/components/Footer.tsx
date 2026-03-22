import { Github, Linkedin, Twitter } from "lucide-react";
import Link from "next/link";

import { BrandLogo } from "./BrandLogo";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-transparent pt-16 pb-8">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mb-16 grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          <div className="col-span-2 lg:col-span-2">
            <Link
              href="/"
              className="brand-logo-glow mb-6 inline-flex"
            >
              <BrandLogo />
            </Link>
            <p className="mb-6 max-w-sm text-zinc-400">
              Desktop meeting intelligence with local capture, secure
              post-meeting AI, and workspace-ready exports for teams that need a
              cleaner operational flow.
            </p>
            <div className="flex gap-4">
              <a href="#" className="brand-icon-button rounded-full p-2">
                <Twitter className="h-5 w-5" />
                <span className="sr-only">Twitter</span>
              </a>
              <a href="#" className="brand-icon-button rounded-full p-2">
                <Github className="h-5 w-5" />
                <span className="sr-only">GitHub</span>
              </a>
              <a href="#" className="brand-icon-button rounded-full p-2">
                <Linkedin className="h-5 w-5" />
                <span className="sr-only">LinkedIn</span>
              </a>
            </div>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-white">Product</h4>
            <ul className="space-y-3">
              <li>
                <Link href="#features" className="brand-link text-zinc-400">
                  Features
                </Link>
              </li>
              <li>
                <Link href="#how-it-works" className="brand-link text-zinc-400">
                  Workflow
                </Link>
              </li>
              <li>
                <Link href="#pricing" className="brand-link text-zinc-400">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="#faq" className="brand-link text-zinc-400">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="#features" className="brand-link text-zinc-400">
                  Integrations
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-white">Company</h4>
            <ul className="space-y-3">
              <li>
                <Link href="#" className="brand-link text-zinc-400">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="#" className="brand-link text-zinc-400">
                  Careers
                </Link>
              </li>
              <li>
                <Link href="#" className="brand-link text-zinc-400">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="#" className="brand-link text-zinc-400">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-white">Legal</h4>
            <ul className="space-y-3">
              <li>
                <Link href="#" className="brand-link text-zinc-400">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="#" className="brand-link text-zinc-400">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="#" className="brand-link text-zinc-400">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link href="#" className="brand-link text-zinc-400">
                  Security
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 md:flex-row">
          <p className="text-sm text-zinc-500">&copy; 2026 NextStop, Inc. All rights reserved.</p>
          <div className="flex gap-6">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
              <span className="inline-flex h-2 w-2 rounded-full bg-green-500"></span>
              <span className="absolute left-1 ml-4 -mt-1 w-max text-xs font-medium text-zinc-500">
                All systems operational
              </span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

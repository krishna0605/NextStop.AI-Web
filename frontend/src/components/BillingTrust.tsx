import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

import { billingTrustLinks, billingTrustNotes } from "@/lib/pricing-plans";

export function BillingTrust({
  notes = billingTrustNotes,
  compact = false,
}: {
  notes?: readonly string[];
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-black/20 ${
        compact ? "px-4 py-3" : "p-5"
      }`}
      aria-label="Billing trust details"
    >
      <div className="space-y-2">
        {notes.map((note) => (
          <div key={note} className="flex items-start gap-2 text-xs leading-5 text-zinc-300">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--brand-highlight)]" />
            <span>{note}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {billingTrustLinks.map((link) => (
          <Link key={link.href} href={link.href} className="brand-link text-zinc-400">
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

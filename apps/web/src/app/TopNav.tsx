"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/" && pathname.startsWith(href));
  return (
    <Link
      href={href}
      className={[
        "rounded-full border px-3 py-1 text-xs font-semibold",
        active
          ? "border-zinc-500 bg-zinc-950/50 text-white"
          : "border-zinc-800 bg-zinc-950/30 text-zinc-200 hover:border-zinc-600",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

export default function TopNav() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href="/" className="flex items-baseline gap-3">
        <span className="text-sm font-semibold tracking-tight text-white">Veri Snap</span>
        <span className="text-[10px] uppercase tracking-[0.5em] text-zinc-500">LaunchReceipt</span>
      </Link>

      <nav className="flex flex-wrap gap-2">
        <Link
          href="/docs/quickstart"
          scroll={false}
          className="rounded-full border border-emerald-700/60 bg-emerald-950/30 px-4 py-1 text-xs font-semibold text-emerald-100 hover:border-emerald-500"
        >
          Docs
        </Link>
        <NavLink href="/draft" label="Draft" />
        <NavLink href="/" label="Home" />
      </nav>
    </div>
  );
}

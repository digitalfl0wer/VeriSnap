import type { Metadata } from "next";
import Link from "next/link";
import { getAllDocsMeta } from "@/app/docs/_lib/docs";

export const metadata: Metadata = {
  title: "Docs — Veri Snap",
  description: "Documentation for Veri Snap (LaunchReceipt).",
};

export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  const nav = await getAllDocsMeta();

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.5em] text-zinc-500">Documentation</p>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Veri Snap Docs</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/"
            className="rounded-full border border-zinc-800 bg-zinc-950/30 px-3 py-1 text-xs font-semibold text-zinc-200 hover:border-zinc-600"
          >
            Home
          </Link>
          <Link
            href="/draft"
            className="rounded-full border border-zinc-800 bg-zinc-950/30 px-3 py-1 text-xs font-semibold text-zinc-200 hover:border-zinc-600"
          >
            Draft
          </Link>
        </div>
      </header>

      <div className="grid gap-10 md:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Pages</p>
          <nav className="space-y-1">
            {nav.map((item) => (
              <Link
                key={item.slug}
                href={`/docs/${item.slug}`}
                className="block rounded-xl border border-zinc-900 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-700"
              >
                {item.title}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}

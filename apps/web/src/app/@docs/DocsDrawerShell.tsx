"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

type NavItem = { slug: string; title: string };

export default function DocsDrawerShell({
  title,
  nav,
  children,
}: {
  title: string;
  nav: NavItem[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onClose = () => {
    if (window.history.length > 1) router.back();
    else router.push("/");
  };

  const activeSlug = pathname.startsWith("/docs/") ? pathname.split("/")[2] ?? "" : "";

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close docs"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      <div className="absolute inset-y-0 left-0 flex w-[92vw] max-w-[980px] flex-col overflow-hidden border-r border-zinc-800 bg-zinc-950 shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-900 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.5em] text-zinc-500">Docs</p>
            <h2 className="truncate text-sm font-semibold text-white">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zinc-800 bg-zinc-950/30 px-3 py-1 text-xs font-semibold text-zinc-200 hover:border-zinc-600"
          >
            Close
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[260px_minmax(0,1fr)]">
          <aside className="min-h-0 overflow-y-auto border-r border-zinc-900 px-3 py-3">
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">Pages</p>
            <nav className="space-y-1">
              {nav.map((item) => {
                const active = item.slug === activeSlug;
                return (
                  <Link
                    key={item.slug}
                    href={`/docs/${item.slug}`}
                    scroll={false}
                    className={[
                      "block rounded-xl border px-3 py-2 text-sm",
                      active
                        ? "border-zinc-600 bg-zinc-950/40 text-white"
                        : "border-zinc-900 bg-zinc-950/20 text-zinc-200 hover:border-zinc-700",
                    ].join(" ")}
                  >
                    {item.title}
                  </Link>
                );
              })}
            </nav>
          </aside>

          <main className="min-h-0 overflow-y-auto px-6 py-6">{children}</main>
        </div>
      </div>
    </div>
  );
}


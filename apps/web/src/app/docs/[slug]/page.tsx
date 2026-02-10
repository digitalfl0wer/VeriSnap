import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllDocsMeta, readDocSource } from "@/app/docs/_lib/docs";
import { MarkdownBody, parseMarkdown } from "@/app/docs/_lib/markdown";

export async function generateStaticParams() {
  const items = await getAllDocsMeta();
  return items.map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const items = await getAllDocsMeta();
  const doc = items.find((i) => i.slug === params.slug);
  return {
    title: doc ? `${doc.title} — Docs` : "Docs",
  };
}

export default async function DocPage({ params }: { params: { slug: string } }) {
  const items = await getAllDocsMeta();
  const idx = items.findIndex((i) => i.slug === params.slug);
  if (idx === -1) notFound();

  const doc = items[idx]!;
  const raw = await readDocSource(doc.filename);
  const firstH1 = parseMarkdown(raw).find((b) => b.type === "heading" && b.level === 1);
  const title = firstH1 && firstH1.type === "heading" ? firstH1.text : doc.title;
  const prev = idx > 0 ? items[idx - 1] : null;
  const next = idx < items.length - 1 ? items[idx + 1] : null;

  return (
    <article className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.5em] text-zinc-500">Docs</p>
        <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
        <p className="text-sm text-zinc-400">Rendered from markdown files inside the app UI.</p>
      </header>

      <MarkdownBody source={raw} />

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-900 pt-6">
        {prev ? (
          <Link
            href={`/docs/${prev.slug}`}
            className="rounded-2xl border border-zinc-900 bg-zinc-950/20 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-700"
          >
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/docs/${next.slug}`}
            className="rounded-2xl border border-zinc-900 bg-zinc-950/20 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-700"
          >
            {next.title} →
          </Link>
        ) : null}
      </footer>
    </article>
  );
}

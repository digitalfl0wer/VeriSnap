import { notFound } from "next/navigation";

import DocsDrawerShell from "@/app/@docs/DocsDrawerShell";
import { getAllDocsMeta, readDocSource } from "@/app/docs/_lib/docs";
import { MarkdownBody, parseMarkdown } from "@/app/docs/_lib/markdown";

export default async function DocsDrawerDocPage({ params }: { params: { slug: string } }) {
  const items = await getAllDocsMeta();
  const doc = items.find((i) => i.slug === params.slug);
  if (!doc) notFound();

  const raw = await readDocSource(doc.filename);
  const blocks = parseMarkdown(raw);
  const firstH1 = blocks.find((b) => b.type === "heading" && b.level === 1);
  const title = firstH1 && firstH1.type === "heading" ? firstH1.text : doc.title;

  return (
    <DocsDrawerShell title={title} nav={items.map((i) => ({ slug: i.slug, title: i.title }))}>
      <MarkdownBody source={raw} />
    </DocsDrawerShell>
  );
}


import DocsDrawerShell from "@/app/@docs/DocsDrawerShell";
import { getAllDocsMeta, readDocSource } from "@/app/docs/_lib/docs";
import { MarkdownBody } from "@/app/docs/_lib/markdown";

export default async function DocsDrawerIndexPage() {
  const items = await getAllDocsMeta();
  const first = items[0];

  const title = first ? first.title : "Docs";
  const raw = first ? await readDocSource(first.filename) : "# Docs\n\nNo docs found.";

  return (
    <DocsDrawerShell title={title} nav={items.map((i) => ({ slug: i.slug, title: i.title }))}>
      <MarkdownBody source={raw} />
    </DocsDrawerShell>
  );
}


import Link from "next/link";
import { getAllDocsMeta } from "@/app/docs/_lib/docs";

export default async function DocsIndexPage() {
  const docs = await getAllDocsMeta();
  const first = docs[0];

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-white">Start here</h2>
        <p className="max-w-2xl text-sm text-zinc-400">
          These docs explain how Veri Snap generates draft receipts for ERC-20 launches on Base, how publishing works, and how to read/verify a receipt over time.
        </p>
      </div>

      {first ? (
        <Link
          href={`/docs/${first.slug}`}
          className="inline-flex rounded-2xl border border-zinc-800 bg-zinc-950/30 px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-zinc-600"
        >
          Open {first.title}
        </Link>
      ) : (
        <p className="text-sm text-zinc-400">No docs found in `src/content/docs`.</p>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">All pages</h3>
        <ul className="space-y-2">
          {docs.map((d) => (
            <li key={d.slug}>
              <Link
                href={`/docs/${d.slug}`}
                className="block rounded-2xl border border-zinc-900 bg-zinc-950/20 px-4 py-3 text-sm text-zinc-200 hover:border-zinc-700"
              >
                {d.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

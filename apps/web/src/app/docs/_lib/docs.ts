import { promises as fs } from "node:fs";
import path from "node:path";

export type DocMeta = {
  slug: string;
  title: string;
  order: number;
  filename: string;
};

export const DOCS_DIR = path.join(process.cwd(), "src", "content", "docs");

function titleFromFilename(filename: string) {
  const base = filename.replace(/\.mdx?$/, "");
  const withoutOrder = base.replace(/^\d+-/, "");
  return withoutOrder
    .split("-")
    .map((s) => s.slice(0, 1).toUpperCase() + s.slice(1))
    .join(" ");
}

export async function getAllDocsMeta(): Promise<DocMeta[]> {
  const entries = await fs.readdir(DOCS_DIR, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && e.name.endsWith(".mdx"))
    .map((e) => e.name);

  const items = await Promise.all(
    files.map(async (filename) => {
      const raw = await fs.readFile(path.join(DOCS_DIR, filename), "utf8");
      const firstHeading = raw
        .split(/\r?\n/)
        .find((line) => line.startsWith("# "))
        ?.replace(/^#\s+/, "")
        .trim();

      const orderMatch = filename.match(/^(\d+)-/);
      const order = orderMatch ? Number(orderMatch[1]) : 999;
      const base = filename.replace(/\.mdx$/, "");
      const slug = base.replace(/^\d+-/, "");

      return {
        slug,
        title: firstHeading || titleFromFilename(filename),
        order,
        filename,
      };
    }),
  );

  return items.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

export async function readDocSource(filename: string) {
  return fs.readFile(path.join(DOCS_DIR, filename), "utf8");
}


import type { ReactNode } from "react";

function isSafeHref(href: string) {
  return href.startsWith("/") || href.startsWith("https://") || href.startsWith("http://");
}

type InlineToken =
  | { type: "text"; value: string }
  | { type: "code"; value: string }
  | { type: "link"; label: string; href: string }
  | { type: "strong"; value: string }
  | { type: "em"; value: string };

function tokenizeInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let remaining = text;

  while (remaining.length) {
    const codeIdx = remaining.indexOf("`");
    const linkIdx = remaining.indexOf("[");
    const strongIdx = remaining.indexOf("**");
    const emIdx = remaining.indexOf("*");

    const candidates = [
      { kind: "code", idx: codeIdx },
      { kind: "link", idx: linkIdx },
      { kind: "strong", idx: strongIdx },
      { kind: "em", idx: emIdx },
    ].filter((c) => c.idx !== -1);

    if (!candidates.length) {
      tokens.push({ type: "text", value: remaining });
      break;
    }

    const next = candidates.reduce((a, b) => (b.idx < a.idx ? b : a));
    if (next.idx > 0) {
      tokens.push({ type: "text", value: remaining.slice(0, next.idx) });
      remaining = remaining.slice(next.idx);
      continue;
    }

    if (next.kind === "code" && remaining.startsWith("`")) {
      const end = remaining.indexOf("`", 1);
      if (end === -1) {
        tokens.push({ type: "text", value: remaining });
        break;
      }
      tokens.push({ type: "code", value: remaining.slice(1, end) });
      remaining = remaining.slice(end + 1);
      continue;
    }

    if (next.kind === "link" && remaining.startsWith("[")) {
      const closeBracket = remaining.indexOf("]");
      const openParen = closeBracket === -1 ? -1 : remaining.indexOf("(", closeBracket);
      const closeParen = openParen === -1 ? -1 : remaining.indexOf(")", openParen);
      if (closeBracket !== -1 && openParen === closeBracket + 1 && closeParen !== -1) {
        const label = remaining.slice(1, closeBracket);
        const href = remaining.slice(openParen + 1, closeParen);
        tokens.push({ type: "link", label, href });
        remaining = remaining.slice(closeParen + 1);
        continue;
      }
    }

    if (next.kind === "strong" && remaining.startsWith("**")) {
      const end = remaining.indexOf("**", 2);
      if (end !== -1) {
        tokens.push({ type: "strong", value: remaining.slice(2, end) });
        remaining = remaining.slice(end + 2);
        continue;
      }
    }

    if (next.kind === "em" && remaining.startsWith("*")) {
      // Avoid consuming the first '*' in a '**' token we couldn't parse
      if (remaining.startsWith("**")) {
        tokens.push({ type: "text", value: "*" });
        remaining = remaining.slice(1);
        continue;
      }
      const end = remaining.indexOf("*", 1);
      if (end !== -1) {
        tokens.push({ type: "em", value: remaining.slice(1, end) });
        remaining = remaining.slice(end + 1);
        continue;
      }
    }

    tokens.push({ type: "text", value: remaining.slice(0, 1) });
    remaining = remaining.slice(1);
  }

  return tokens;
}

export function renderInline(text: string): ReactNode[] {
  const tokens = tokenizeInline(text);
  let key = 0;

  return tokens.map((t) => {
    if (t.type === "text") return t.value;
    if (t.type === "code") {
      return (
        <code key={`c${key++}`} className="rounded-md border border-zinc-800 bg-zinc-950 px-1.5 py-0.5 font-mono text-[0.95em] text-zinc-200">
          {t.value}
        </code>
      );
    }
    if (t.type === "strong") return <strong key={`s${key++}`}>{t.value}</strong>;
    if (t.type === "em") return <em key={`e${key++}`}>{t.value}</em>;
    if (t.type === "link") {
      if (!isSafeHref(t.href)) return t.label;
      const external = t.href.startsWith("http");
      return (
        <a
          key={`a${key++}`}
          href={t.href}
          className="underline decoration-zinc-600 underline-offset-4 hover:decoration-zinc-300"
          target={external ? "_blank" : undefined}
          rel={external ? "noreferrer" : undefined}
        >
          {t.label}
        </a>
      );
    }
    return null;
  });
}

type Block =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "code"; lang: string | null; code: string };

export function parseMarkdown(source: string): Block[] {
  const lines = source.split(/\r?\n/);
  const blocks: Block[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (!line.trim()) {
      i += 1;
      continue;
    }

    const fence = line.match(/^```(\S+)?\s*$/);
    if (fence) {
      const lang = fence[1] ?? null;
      i += 1;
      const buf: string[] = [];
      while (i < lines.length && !(lines[i] ?? "").startsWith("```")) {
        buf.push(lines[i] ?? "");
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push({ type: "code", lang, code: buf.join("\n") });
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      const hashes = heading[1] ?? "#";
      const text = (heading[2] ?? "").trim();
      const level = (Math.max(1, Math.min(3, hashes.length)) as 1 | 2 | 3);
      blocks.push({ type: "heading", level, text });
      i += 1;
      continue;
    }

    if (/^\s*- /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*- /.test(lines[i] ?? "")) {
        items.push((lines[i] ?? "").replace(/^\s*- /, "").trim());
        i += 1;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    if (/^\s*\d+[\.\)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[\.\)]\s+/.test(lines[i] ?? "")) {
        items.push((lines[i] ?? "").replace(/^\s*\d+[\.\)]\s+/, "").trim());
        i += 1;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    const para: string[] = [];
    while (i < lines.length) {
      const l = lines[i] ?? "";
      if (!l.trim()) break;
      if (l.startsWith("#") || l.startsWith("```") || /^\s*- /.test(l) || /^\s*\d+[\.\)]\s+/.test(l)) break;
      para.push(l.trim());
      i += 1;
    }
    blocks.push({ type: "paragraph", text: para.join(" ") });
  }

  return blocks;
}

export function MarkdownBody({ source }: { source: string }) {
  const blocks = parseMarkdown(source);

  return (
    <div className="space-y-5">
      {blocks.map((b, idx) => {
        if (b.type === "heading") {
          const Tag = b.level === 1 ? "h1" : b.level === 2 ? "h2" : "h3";
          const className =
            b.level === 1
              ? "text-2xl font-semibold text-white"
              : b.level === 2
                ? "pt-2 text-lg font-semibold text-white"
                : "pt-2 text-sm font-semibold uppercase tracking-widest text-zinc-400";
          return (
            <Tag key={idx} className={className}>
              {b.text}
            </Tag>
          );
        }

        if (b.type === "paragraph") {
          return (
            <p key={idx} className="leading-7 text-zinc-300">
              {renderInline(b.text)}
            </p>
          );
        }

        if (b.type === "ul") {
          return (
            <ul key={idx} className="list-disc space-y-1 pl-6 text-zinc-300">
              {b.items.map((item, j) => (
                <li key={j} className="leading-7">
                  {renderInline(item)}
                </li>
              ))}
            </ul>
          );
        }

        if (b.type === "ol") {
          return (
            <ol key={idx} className="list-decimal space-y-1 pl-6 text-zinc-300">
              {b.items.map((item, j) => (
                <li key={j} className="leading-7">
                  {renderInline(item)}
                </li>
              ))}
            </ol>
          );
        }

        return (
          <pre key={idx} className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-xs text-zinc-200">
            <code>{b.code}</code>
          </pre>
        );
      })}
    </div>
  );
}

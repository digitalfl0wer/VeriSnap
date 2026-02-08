"use client";

import type { Address } from "@verisnap/core";
import { useCallback, useEffect, useMemo, useState } from "react";

import Receipt from "@/app/_components/Receipt";

type DraftApiResponse =
  | { ok: true; result: any }
  | { ok: false; error: string };

export default function DraftReceipt({ address }: { address: string }) {
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<any | null>(null);
  const [email, setEmail] = useState("");
  const [watchStatus, setWatchStatus] = useState<string | null>(null);
  const [builderLinks, setBuilderLinks] = useState<Array<{ label: string; url: string }>>(DEFAULT_BUILDER_LINKS);

  const contractAddress = useMemo(() => (address.trim() as Address), [address]);
  const validAddress = /^0x[0-9a-fA-F]{40}$/.test(contractAddress);

  const loadDraft = useCallback((links: Array<{ label: string; url: string }>) => {
    if (!validAddress) return () => undefined;
    setError(null);
    setData(null);
    setPublishResult(null);

    const controller = new AbortController();
    fetch("/api/draft", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contractAddress,
        builderLinks: links.filter((l) => l.url.trim()).slice(0, 3),
      }),
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((json: DraftApiResponse) => {
        if (!json.ok) throw new Error(json.error);
        setData(json.result);
      })
      .catch((e) => {
        if (e?.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Failed to generate draft");
      });

    return () => controller.abort();
  }, [contractAddress, validAddress]);

  useEffect(() => {
    setBuilderLinks(DEFAULT_BUILDER_LINKS);
    return loadDraft(DEFAULT_BUILDER_LINKS);
  }, [contractAddress, loadDraft]);

  const onPublish = async () => {
    if (!data) return;
    setPublishing(true);
    setPublishResult(null);
    setError(null);

    try {
      const response = await fetch("/api/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: data.project.slug, version: data.snapshot.version }),
      });
      const json = (await response.json()) as any;
      if (!json.ok) throw new Error(json.error ?? "Publish failed");
      setPublishResult(json.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  };

  const onSubscribe = async () => {
    if (!data) return;
    setWatchStatus(null);
    try {
      const response = await fetch("/api/watch/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectSlug: data.project.slug, email }),
      });
      const json = (await response.json()) as any;
      if (!json.ok) throw new Error(json.error ?? "Subscribe failed");
      setWatchStatus("Check your email to verify (double opt-in).");
    } catch (e) {
      setWatchStatus(e instanceof Error ? e.message : "Subscribe failed");
    }
  };

  if (!validAddress) {
    return (
      <main className="space-y-3">
        <h1 className="text-xl font-semibold text-white">Draft</h1>
        <p className="text-zinc-400">Missing or invalid address. Go back and paste a valid 0x… address.</p>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.5em] text-zinc-500">Draft</p>
        <h1 className="text-2xl font-semibold text-white">LaunchReceipt draft</h1>
        <p className="text-sm text-zinc-400">{contractAddress}</p>
      </header>

      {error ? <p className="rounded-2xl border border-rose-900 bg-rose-950/40 p-4 text-rose-200">{error}</p> : null}
      {!data ? <p className="text-zinc-400">Generating…</p> : <Receipt project={data.project} snapshot={data.snapshot} />}

      {data ? (
        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/20 p-6">
          <h2 className="text-lg font-semibold text-white">Builder links (optional)</h2>
          <p className="mt-2 text-sm text-zinc-400">Up to 3 links are shown on the receipt.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {builderLinks.map((link, idx) => (
              <label key={idx} className="space-y-1">
                <span className="text-xs uppercase tracking-[0.3em] text-zinc-500">{link.label}</span>
                <input
                  value={link.url}
                  onChange={(e) =>
                    setBuilderLinks((prev) => prev.map((p, i) => (i === idx ? { ...p, url: e.target.value } : p)))
                  }
                  placeholder="https://…"
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/50 px-4 py-3 text-sm text-zinc-200 outline-none focus:border-emerald-400"
                />
              </label>
            ))}
          </div>
          <div className="mt-4">
            <button
              onClick={() => loadDraft(builderLinks)}
              className="rounded-2xl border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-200 hover:border-zinc-500"
            >
              Update draft
            </button>
          </div>
        </section>
      ) : null}

      {data ? (
        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h2 className="text-lg font-semibold text-white">Publish</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Publishing pins the snapshot to IPFS (if configured) and stores an immutable version in Supabase.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              onClick={onPublish}
              disabled={publishing}
              className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-black disabled:opacity-60"
            >
              {publishing ? "Publishing…" : `Publish v${data.snapshot.version}`}
            </button>
            {publishResult?.links?.version ? (
              <a className="text-sm font-semibold text-emerald-300 underline" href={publishResult.links.version}>
                View published receipt
              </a>
            ) : null}
          </div>
          {publishResult ? (
            <pre className="mt-4 overflow-auto rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4 text-xs text-zinc-200">
              {JSON.stringify(publishResult, null, 2)}
            </pre>
          ) : null}
        </section>
      ) : null}

      {data ? (
        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/20 p-6">
          <h2 className="text-lg font-semibold text-white">Watch Mode</h2>
          <p className="mt-2 text-sm text-zinc-400">Subscribe to receive email when trust-relevant fields change.</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1 space-y-1">
              <span className="text-xs uppercase tracking-[0.3em] text-zinc-500">Email</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/50 px-4 py-3 text-sm text-zinc-200 outline-none focus:border-emerald-400"
              />
            </label>
            <button
              onClick={onSubscribe}
              className="rounded-2xl border border-emerald-400 px-5 py-3 text-sm font-semibold text-emerald-200 hover:bg-emerald-400/10"
            >
              Subscribe
            </button>
          </div>
          {watchStatus ? <p className="mt-3 text-sm text-zinc-300">{watchStatus}</p> : null}
        </section>
      ) : null}
    </main>
  );
}

const DEFAULT_BUILDER_LINKS: Array<{ label: string; url: string }> = [
  { label: "Website", url: "" },
  { label: "Docs", url: "" },
  { label: "Social", url: "" },
];

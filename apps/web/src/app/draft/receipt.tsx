"use client";

import type { Address } from "@verisnap/core";
import { useCallback, useEffect, useMemo, useState } from "react";

import Receipt from "@/app/_components/Receipt";
import { basescanAddressUrl, blockscoutAddressUrl } from "@/lib/explorers";

type DraftApiResponse =
  | { ok: true; result: any }
  | { ok: false; error: string };

export default function DraftReceipt({ address }: { address: string }) {
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<any | null>(null);
  const [email, setEmail] = useState("");
  const [watchStatus, setWatchStatus] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletStatus, setWalletStatus] = useState<string | null>(null);

  const contractAddress = useMemo(() => (address.trim() as Address), [address]);
  const validAddress = /^0x[0-9a-fA-F]{40}$/.test(contractAddress);

  const loadDraft = useCallback(() => {
    if (!validAddress) return () => undefined;
    setError(null);
    setData(null);
    setPublishResult(null);
    setLoading(true);
    setLoadingStatus("Reading on-chain data…");

    const controller = new AbortController();
    fetch("/api/draft", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contractAddress,
        builderLinks: [],
      }),
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((json: DraftApiResponse) => {
        if (!json.ok) throw new Error(json.error);
        setData(json.result);
        setLoadingStatus("Draft ready");
      })
      .catch((e) => {
        if (e?.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Failed to generate draft");
      })
      .finally(() => {
        setLoading(false);
        setTimeout(() => setLoadingStatus(null), 1200);
      });

    return () => controller.abort();
  }, [contractAddress, validAddress]);

  useEffect(() => {
    return loadDraft();
  }, [contractAddress, loadDraft]);

  const onPublish = async () => {
    if (!data) return;
    setPublishing(true);
    setPublishResult(null);
    setError(null);

    try {
      const signer = await ensureWallet();
      if (!signer) {
        throw new Error("Wallet connection is required to publish");
      }

      const claimStart = await fetch("/api/claim/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tokenAddress: contractAddress,
          slug: data.project.slug,
          version: data.snapshot.version,
        }),
      });
      const claimJson = (await claimStart.json()) as any;
      if (!claimJson.ok) throw new Error(claimJson.error ?? "Failed to start claim");

      const message: string = claimJson.message;
      const token: string = claimJson.token;

      const signature = await personalSign(message, signer);

      const response = await fetch("/api/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug: data.project.slug,
          version: data.snapshot.version,
          token,
          message,
          signature,
        }),
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

  const ensureWallet = async (): Promise<string | null> => {
    if (walletAddress) return walletAddress;
    const ethereum = (window as any).ethereum as
      | undefined
      | {
          request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
        };

    if (!ethereum) {
      setWalletStatus("No wallet detected. Install MetaMask or use a WalletConnect-enabled browser.");
      return null;
    }

    setWalletStatus("Connecting wallet…");
    const accounts = (await ethereum.request({ method: "eth_requestAccounts" })) as string[];
    const selected = accounts?.[0]?.toLowerCase() ?? null;
    setWalletAddress(selected);
    setWalletStatus(selected ? `Connected: ${selected}` : "Wallet connection failed");
    return selected;
  };

  const personalSign = async (message: string, address: string): Promise<`0x${string}`> => {
    const ethereum = (window as any).ethereum as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };

    setWalletStatus("Awaiting signature…");
    try {
      const sig = (await ethereum.request({
        method: "personal_sign",
        params: [message, address],
      })) as string;
      setWalletStatus("Signed");
      return sig as `0x${string}`;
    } catch {
      const sig = (await ethereum.request({
        method: "personal_sign",
        params: [address, message],
      })) as string;
      setWalletStatus("Signed");
      return sig as `0x${string}`;
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

  const onCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus(`${label} copied`);
      setTimeout(() => setCopyStatus(null), 1500);
    } catch {
      setCopyStatus("Copy failed");
      setTimeout(() => setCopyStatus(null), 1500);
    }
  };

  if (!validAddress) {
    return (
      <main className="space-y-3">
        <h1 className="text-xl font-semibold text-white">Draft</h1>
        <p className="text-zinc-400">Missing or invalid address. Go back and paste a valid 0x… address.</p>
        <p className="text-sm text-zinc-400">
          <a className="underline" href="/">
            Back to home
          </a>
        </p>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.5em] text-zinc-500">Draft</p>
        <h1 className="text-2xl font-semibold text-white">LaunchReceipt draft</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="break-all font-mono text-xs text-zinc-300">{contractAddress}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onCopy(contractAddress, "Address")}
              className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-200 hover:border-zinc-500"
            >
              Copy
            </button>
            <a
              className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-200 hover:border-zinc-500"
              href={basescanAddressUrl(contractAddress)}
              target="_blank"
              rel="noreferrer"
            >
              BaseScan
            </a>
            <a
              className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-200 hover:border-zinc-500"
              href={blockscoutAddressUrl(contractAddress)}
              target="_blank"
              rel="noreferrer"
            >
              Blockscout
            </a>
          </div>
        </div>
        <StepRow
          steps={[
            { label: "Generate", status: data ? "done" : error ? "error" : "active" },
            { label: "Review", status: data ? "active" : "pending" },
            { label: "Publish", status: publishResult ? "done" : data ? "pending" : "pending" },
            { label: "Watch", status: publishResult ? "active" : "pending" },
          ]}
        />
      </header>

      {copyStatus ? <p className="text-xs text-zinc-400">{copyStatus}</p> : null}
      {error ? <p className="rounded-2xl border border-rose-900 bg-rose-950/40 p-4 text-rose-200">{error}</p> : null}
      {!data ? (
        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/20 p-6">
          <p className="text-sm text-zinc-300">{loadingStatus ?? (loading ? "Generating draft…" : "Waiting…")}</p>
          <ul className="mt-3 space-y-1 text-sm text-zinc-400">
            <li className={loading ? "animate-pulse" : ""}>Reading ERC-20 basics (name/symbol/decimals/supply)</li>
            <li className={loading ? "animate-pulse" : ""}>Checking proxy/admin evidence</li>
            <li className={loading ? "animate-pulse" : ""}>Checking explorer/source verification</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              className="rounded-2xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-zinc-500"
              href="/"
            >
              Back
            </a>
            <button
              type="button"
              onClick={() => loadDraft()}
              disabled={loading}
              className="rounded-2xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Retry
            </button>
          </div>
        </section>
      ) : (
        <Receipt project={data.project} snapshot={data.snapshot} />
      )}

      {data ? (
        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h2 className="text-lg font-semibold text-white">Publish</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Publishing requires a wallet signature and creates a permanent, versioned receipt.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              onClick={onPublish}
              disabled={publishing}
              className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-black disabled:opacity-60"
            >
              {publishing ? "Publishing…" : `Publish v${data.snapshot.version}`}
            </button>
            <button
              type="button"
              onClick={() => ensureWallet().catch(() => undefined)}
              className="rounded-2xl border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-200 hover:border-zinc-500"
            >
              {walletAddress ? "Wallet connected" : "Connect wallet"}
            </button>
            {publishResult?.links?.version ? (
              <a className="text-sm font-semibold text-emerald-300 underline" href={publishResult.links.version}>
                View published receipt
              </a>
            ) : null}
          </div>
          {walletStatus ? <p className="mt-3 text-sm text-zinc-300">{walletStatus}</p> : null}
          {publishResult ? (
            <details className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/30 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-zinc-200">Technical details</summary>
              <pre className="mt-3 overflow-auto rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 text-xs text-zinc-200">
                {JSON.stringify(publishResult, null, 2)}
              </pre>
            </details>
          ) : null}
        </section>
      ) : null}

	      {data ? (
	        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/20 p-6">
	          <h2 className="text-lg font-semibold text-white">Watch Mode</h2>
	          <p className="mt-2 text-sm text-zinc-400">
	            Subscribe to receive an email if important fields change. You’ll confirm via double opt-in before any alerts.
	          </p>
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

function StepRow({
  steps,
}: {
  steps: Array<{ label: string; status: "pending" | "active" | "done" | "error" }>;
}) {
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {steps.map((step) => (
        <span
          key={step.label}
          className={[
            "rounded-full border px-3 py-1 text-xs font-semibold",
            step.status === "done" ? "border-emerald-400/60 text-emerald-200" : "",
            step.status === "active" ? "border-sky-400/60 text-sky-200" : "",
            step.status === "pending" ? "border-zinc-800 text-zinc-400" : "",
            step.status === "error" ? "border-rose-700 text-rose-200" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {step.status === "done" ? "✅ " : step.status === "error" ? "⚠️ " : ""}
          {step.label}
        </span>
      ))}
    </div>
  );
}

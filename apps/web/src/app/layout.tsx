import type { Metadata } from "next";

import "./globals.css";
import TopNav from "@/app/_components/TopNav";

export const metadata: Metadata = {
  title: "Veri Snap — LaunchReceipt",
  description: "Versioned, verified receipts for ERC-20 launches on Base."
};

export default function RootLayout({ children, docs }: { children: React.ReactNode; docs: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-zinc-50 antialiased">
        <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
          <div className="absolute inset-0 bg-[radial-gradient(900px_600px_at_10%_10%,rgba(16,185,129,0.10),transparent_60%),radial-gradient(900px_600px_at_90%_0%,rgba(56,189,248,0.10),transparent_55%),radial-gradient(900px_600px_at_50%_100%,rgba(244,63,94,0.06),transparent_60%)]" />
          <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:64px_64px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/20 to-black/60" />
        </div>
        <div className="relative z-10 mx-auto max-w-5xl px-6 py-10">
          <TopNav />
          <div className="pt-8">{children}</div>
        </div>
        {docs}
      </body>
    </html>
  );
}

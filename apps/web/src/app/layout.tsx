import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Veri Snap — LaunchReceipt",
  description: "Versioned, verified receipts for ERC-20 launches on Base."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-zinc-50">
        <div className="mx-auto max-w-5xl px-6 py-10">{children}</div>
      </body>
    </html>
  );
}


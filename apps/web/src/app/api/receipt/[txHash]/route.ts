import { snapshotTxReceipt } from "@verisnap/worker";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

export async function GET(_request: Request, { params }: { params: { txHash: string } }) {
  const txHash = params.txHash.trim() as `0x${string}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    return Response.json({ ok: false, error: "Invalid tx hash" }, { status: 400 });
  }

  try {
    const chainId = Number(process.env.CHAIN_ID ?? process.env.BASE_CHAIN_ID ?? "8453");
    const rpcUrl = required("BASE_RPC_URL");

    const snapshot = await snapshotTxReceipt({ rpcUrl, chainId }, txHash);
    return Response.json({ ok: true, snapshot });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch receipt";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}


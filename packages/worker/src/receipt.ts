import { canonicalizeJson, hashCanonicalJson } from "@verisnap/core";

export type RpcReceiptConfig = {
  rpcUrl: string;
  chainId: number;
  blockscoutApiBase?: string;
};

export type TxReceiptSnapshot = {
  chainId: number;
  txHash: `0x${string}`;
  observedAt: string;
  blockTimestamp: string;
  tx: {
    hash: `0x${string}`;
    from: `0x${string}`;
    to: `0x${string}` | null;
    nonce: string;
    valueWei: string;
    gasLimit: string;
    gasPriceWei?: string;
    maxFeePerGasWei?: string;
    maxPriorityFeePerGasWei?: string;
  };
  receipt: {
    status: "success" | "revert" | "unknown";
    blockNumber: number;
    blockHash: `0x${string}`;
    transactionIndex: number;
    contractAddress: `0x${string}` | null;
    gasUsed: string;
    effectiveGasPriceWei?: string;
    logs: Array<{
      address: `0x${string}`;
      topics: Array<`0x${string}`>;
      data: `0x${string}`;
      logIndex: number;
    }>;
  };
  derived: {
    isContractDeployment: boolean;
  };
  links: {
    basescanTx: string;
    blockscoutTx: string;
  };
  canonicalJson: string;
  canonicalHash: `0x${string}`;
};

export async function snapshotTxReceipt(
  config: RpcReceiptConfig,
  txHash: `0x${string}`
): Promise<TxReceiptSnapshot> {
  const observedAt = new Date().toISOString();

  const [tx, receipt] = await Promise.all([
    rpcCall<any>(config.rpcUrl, "eth_getTransactionByHash", [txHash]),
    rpcCall<any>(config.rpcUrl, "eth_getTransactionReceipt", [txHash]),
  ]);

  if (!tx) throw new Error("Transaction not found");
  if (!receipt) throw new Error("Receipt not found (tx may be pending)");

  const block = await rpcCall<any>(config.rpcUrl, "eth_getBlockByNumber", [receipt.blockNumber, false]);
  if (!block) throw new Error("Block not found");

  const blockTimestamp = hexToNumber(block.timestamp);
  const blockTimestampIso = new Date(blockTimestamp * 1000).toISOString();

  const status =
    receipt.status === "0x1" ? ("success" as const) : receipt.status === "0x0" ? ("revert" as const) : ("unknown" as const);

  const txSnapshot = {
    chainId: config.chainId,
    txHash,
    observedAt,
    blockTimestamp: blockTimestampIso,
    tx: {
      hash: tx.hash as `0x${string}`,
      from: tx.from as `0x${string}`,
      to: (tx.to ?? null) as `0x${string}` | null,
      nonce: hexToBigInt(tx.nonce).toString(10),
      valueWei: hexToBigInt(tx.value).toString(10),
      gasLimit: hexToBigInt(tx.gas).toString(10),
      gasPriceWei: tx.gasPrice ? hexToBigInt(tx.gasPrice).toString(10) : undefined,
      maxFeePerGasWei: tx.maxFeePerGas ? hexToBigInt(tx.maxFeePerGas).toString(10) : undefined,
      maxPriorityFeePerGasWei: tx.maxPriorityFeePerGas ? hexToBigInt(tx.maxPriorityFeePerGas).toString(10) : undefined,
    },
    receipt: {
      status,
      blockNumber: hexToNumber(receipt.blockNumber),
      blockHash: receipt.blockHash as `0x${string}`,
      transactionIndex: hexToNumber(receipt.transactionIndex),
      contractAddress: (receipt.contractAddress ?? null) as `0x${string}` | null,
      gasUsed: hexToBigInt(receipt.gasUsed).toString(10),
      effectiveGasPriceWei: receipt.effectiveGasPrice ? hexToBigInt(receipt.effectiveGasPrice).toString(10) : undefined,
      logs: Array.isArray(receipt.logs)
        ? receipt.logs.map((log: any) => ({
            address: log.address as `0x${string}`,
            topics: (Array.isArray(log.topics) ? log.topics : []) as Array<`0x${string}`>,
            data: log.data as `0x${string}`,
            logIndex: hexToNumber(log.logIndex),
          }))
        : [],
    },
    derived: {
      isContractDeployment: Boolean(receipt.contractAddress),
    },
    links: {
      basescanTx: `https://basescan.org/tx/${txHash}`,
      blockscoutTx: `https://base.blockscout.com/tx/${txHash}`,
    },
  };

  const canonicalJson = canonicalizeJson(txSnapshot);
  const canonicalHash = hashCanonicalJson(txSnapshot) as `0x${string}`;

  return {
    ...txSnapshot,
    canonicalJson,
    canonicalHash,
  };
}

async function rpcCall<T>(rpcUrl: string, method: string, params: unknown[]): Promise<T> {
  const payload = { jsonrpc: "2.0", id: 1, method, params };
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`RPC ${method} failed (${response.status})`);
  }

  const json = (await response.json()) as { result?: T; error?: { message?: string } };
  if (json.error?.message) throw new Error(json.error.message);
  return json.result as T;
}

function hexToBigInt(value: string): bigint {
  if (!value) return BigInt(0);
  return BigInt(value);
}

function hexToNumber(value: string): number {
  return Number(hexToBigInt(value));
}


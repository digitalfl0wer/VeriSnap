import {createPublicClient, http } from "viem";
import {base, baseSepolia} from "viem/chains";

const chainKey = process.env.VERISNAP_CHAIN ?? "base-sepolia";
const chain = chainKey === "base-mainnet" ? base : baseSepolia;

const rpcUrl = chainKey === "base-mainnet" ?process.env.BASE_MAINNET_RPC_URL : process.env.BASE_SEPOLIA_RPC_URL;

if (!rpcUrl) throw new Error("Missing RPC URL env var")

    export const publicClient = createPublicClient({
        chain, transport: http(rpcUrl)
    });
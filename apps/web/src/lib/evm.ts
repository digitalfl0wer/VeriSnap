import {publicClient} from "@/lib/rpc";
import type {Address} from "viem";

export async function isContractAddress(address: Address){
    const code = await publicClient.getCode({address});
    return !!code && code !== "0x";
}
import {NextResponse} from "next/server";
import{publicClient} from "@/lib/rpc";

export async function GET() {
    const blockNumber = await publicClient.getBlockNumber();
    return NextResponse.json({
        ok:true, blockNumber : blockNumber.toString(),
    });
}
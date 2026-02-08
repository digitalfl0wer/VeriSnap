import { createWorker, type WorkerEnv } from "@verisnap/worker";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

export function getWorker() {
  const env: WorkerEnv = {
    supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseAnonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
    baseRpcUrl: required("BASE_RPC_URL"),
    baseChainId: Number(process.env.CHAIN_ID ?? process.env.BASE_CHAIN_ID ?? "8453"),
    basescanApiKey: process.env.BASESCAN_API_KEY,
    enableBaseScan: process.env.ENABLE_BASESCAN === "1",
    pinataJwt: process.env.PINATA_JWT,
    resendApiKey: process.env.RESEND_API_KEY,
    appBaseUrl: process.env.APP_BASE_URL,
    fromEmail: process.env.FROM_EMAIL,
  };

  return createWorker(env);
}

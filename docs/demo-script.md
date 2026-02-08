# Demo script (V1)

This is a step-by-step walkthrough for a full LaunchReceipt demo: draft → publish → verify → watch → diff.

## Prereqs

- Supabase project with migrations applied (`supabase/migrations/`)
- Env vars configured (`docs/env.md`)
- Base RPC URL that can answer `eth_call`
- (Optional) BaseScan API key, Pinata JWT, Resend API key

## 1) Generate a draft

1. Start the web app: `pnpm -C apps/web dev`
2. Open the homepage and paste a Base ERC-20 contract address.
3. Confirm the draft receipt shows:
   - token name/symbol/decimals/totalSupply (if readable)
   - proxy implementation/admin (if detectable via storage slots)
   - explorer verification (BaseScan, with Sourcify fallback)

## 2) Publish v1

1. On the draft page, click **Publish v1**.
2. Confirm the published receipt shows:
   - stored snapshot hash
   - IPFS CID (if Pinata is configured)
   - permalink (`/p/<slug>/v/1`) and latest (`/p/<slug>`)

## 3) Verify integrity

1. On the published receipt, click **Verify**.
2. Confirm status is `valid` and evidence shows the computed hash matches stored hash.

## 4) Subscribe to Watch Mode

1. Enter an email on the draft page (or any page that offers watch subscribe).
2. Click **Subscribe** and verify via the email link (double opt-in).

## 5) Force a change + diff

To demo diffs, you need a change in at least one watch field:

- proxy implementation changes
- proxy admin changes
- totalSupply changes
- verification / ABI / source availability changes

Then:

1. Trigger a watch run:
   - call `GET /api/cron/poll?secret=<CRON_SECRET>` (or your cron system), or
   - call `POST /api/check-now` with `{ "slug": "<projectSlug>" }`
2. Confirm a new version (v2) is published.
3. Open history (`/p/<slug>/history`) and diff (`/p/<slug>/diff/2`).


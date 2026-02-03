# PRD — LaunchReceipt (LaunchCard V1)

## 1) Problem

Launches on Base/District don’t have a standard, readable, verifiable, versioned “trust snapshot.” Builders struggle to present the important facts, and users struggle to understand what matters — especially when contracts upgrade or admin keys change.

## 2) Goals

- Generate a receipt-style LaunchCard for ERC-20 tokens on Base from a single contract address.
- Make the card plain-language by default with a raw technical toggle.
- Enable immutable snapshots and version history.
- Provide Verify (hash integrity) and Diff (what changed).
- Make Watch Mode required and reliable, with double opt-in email verification.
- Keep the system free-first and light on infra.

## 3) Non-goals (V1)

- Non-ERC-20 support
- Safety verdicts or “guaranteed safe” labeling
- Real-time monitoring via event/log subscriptions
- Arweave publishing
- Embedded widgets/badges
- Full user accounts/auth (only watcher emails)

## 4) Users

- Builder: creates and publishes a LaunchReceipt for their token.
- Secondary user (judge/community): views receipt, verifies integrity, compares versions.
- Watcher: subscribes via email and receives change notifications.

## 5) Core UX (receipt-first)

Receipt view requirements:

- Looks like an itemized receipt (“line items”)
- Each line item has a 3-state status: ✅ / ❌ / ❓ Unknown
- “Show raw details” toggle reveals:
  - addresses
  - proxy evidence (storage slot + implementation/admin)
  - ABI/function evidence (when verified)
  - provenance (chain vs BaseScan vs Sourcify vs builder input)
- Footer includes:
  - Snapshot hash (copy)
  - IPFS CID (copy)
  - Verify button
  - Version (v1/v2/v3) + issued timestamp
  - QR code to permalink

## 6) Functional requirements

### 6.1 Draft generation

Input: contract address

System:

- Confirms it’s a contract (code exists)
- Reads ERC-20 basics (name/symbol/decimals/totalSupply)
- Detects proxy/upgradability via standard storage slot checks
- Pulls verification info:
  - BaseScan first
  - Sourcify only if BaseScan missing/unverified

Produces:

- normalized snapshot JSON
- derived flags (upgradeable, admin present, etc.)
- provenance per field

### 6.2 Publish snapshot (immutable)

Publishing creates a new version:

- Save snapshot JSON + hash in Supabase
- Pin snapshot JSON to IPFS (store CID)
- Mark it “Published”

Generate:

- permalink URL (specific version)
- “latest” URL (always newest)

### 6.3 Verify

Verify button:

- Recompute hash from stored canonical JSON
- Compare to stored hash for that version
- Display match/mismatch + show evidence

### 6.4 Version history + diff

- Timeline list of versions
- Diff view highlights only changed fields
- Each diff row can expand to show raw evidence

### 6.5 Watch Mode (required)

Every published project must have watch mode ON.

- User enters email → double opt-in required
- Watchers can unsubscribe
- Polling job checks “watch fields”
- If change detected:
  - generate new snapshot version
  - compute diff
  - send email to verified watchers

### 6.6 Prechecklist (one-stop shop)

A checklist that answers:

- “What’s already in place?”
- “What’s missing?”
- “What can be auto-filled vs what you need to add?”

Must include:

- Verification status
- Upgradeability/admin status
- Whether raw ABI/source is available
- Basic token disclosures (supply, decimals)
- Optional builder links: website/docs/social (max 3 inputs)

V2 can add “suggested improvements.” V1 is “missing/present” without advice.

## 7) Data sources & fallback

- Onchain reads via Base RPC provider
- BaseScan as primary for verification/ABI/source metadata
- Sourcify fallback fills missing fields only

Merge rule: BaseScan wins; Sourcify fills nulls; conflicts are surfaced as “Unknown/Conflict” in raw view.

## 8) Watch fields (V1 minimal set)

Watch fields should focus on trust-relevant change:

- Proxy implementation address
- Proxy admin (if detectable)
- Owner/admin address (when detectable)
- Verified status / ABI availability
- ERC-20 totalSupply (and mintability signals when ABI is available)
- Pause/blacklist presence (only if ABI is verified)

## 9) Adaptive polling policy

Default checks: every 6 hours, then adapt by token age + risk override:

- 0–30 days: every 6h
- 31–90 days: every 48h
- 91–180 days: every 7 days
- 181+ days: every 30 days only if immutable + no admin powers; otherwise every 7 days

Risk override: if upgradeable/admin/roles detected → max interval 48h (even if older).

Manual check endpoint: rate-limited “Check now”.

## 10) Security & privacy

- Watcher emails are private (RLS)
- Verify tokens stored hashed (or opaque random tokens with strict expiry)
- Unsubscribe required in every email
- No sensitive user data beyond emails for watchers in V1

## 11) V2 roadmap (saved for later)

- “Suggested improvements” section (optional)
- Event/log watching (less polling)
- Arweave publish option
- Embed widget/badge for docs
- Builder claiming via wallet signature
- Smarter notification channels beyond email


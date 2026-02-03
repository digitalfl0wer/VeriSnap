# Contributing

## Source of truth

- `PRD.md` is canon.
- `TASKS.md` must be updated immediately when a task changes state (start/end/blocked/review).

## Agent boundaries (hard)

Each task has exactly one owner. Do not change another owner’s area; instead add a “Change Request” note to `TASKS.md` and ask for reassignment.

- A1 — Integrator/PM: PRD/TASKS, Supabase schema review, merges, release/demo
- A2 — Backend/Data: analyzer, ingestion, polling worker, diff engine, email backend
- A3 — Hashing/Verification: canonicalization + hashing + verify logic
- A4 — Frontend/UI: receipt UI + pages/routes + history/diff/verify views

## Repo structure

- `apps/web` — Next.js app (UI + route handlers)
- `packages/*` — shared libraries (types, analyzer, worker, db)


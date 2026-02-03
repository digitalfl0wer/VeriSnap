# Polling policy (V1)

Default checks: every 6 hours, then adapt by token age + risk override:

- 0–30 days: every 6h
- 31–90 days: every 48h
- 91–180 days: every 7 days
- 181+ days: every 30 days only if immutable + no admin powers; otherwise every 7 days

Risk override: if upgradeable/admin/roles detected → max interval 48h (even if older).


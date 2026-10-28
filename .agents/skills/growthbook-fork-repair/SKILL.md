---
name: growthbook-fork-repair
description: Repair a GrowthBook fork regression that restores license checks, paid-plan downgrades or managed-service calls, or breaks preserved customer integrations. Use for identified preservation failures, including renamed or replaced implementations; not to initiate an unrelated upstream upgrade.
---

# Repair a fork regression

Read the active checkout's `AGENTS.md` and `.agents/guides/fork-policy.md`
([versioned policy](../../guides/fork-policy.md)). Treat E1–P2 as behavior contracts,
not instructions to restore historical files. Inspect existing changes first.

- Reproduce or establish the finding from current code and its actual caller.
  Revalidate audit evidence against the current revision. A missing path may be a
  successful refactor with stale bindings, rather than a product regression.
- Find the narrow authoritative boundary in the new architecture. Preserve
  upstream improvements. Do not blindly revert a file, patch an unused helper,
  return truthy strings in boolean/error APIs or disable every network client.
- For local entitlements, cover both actual and effective plans and all current
  server/UI consumers. Keep user permissions and operational configuration intact.
- For managed services, refuse before writes, credential forwarding or enqueueing.
  Remove active transports, polling and retries; account for already-persisted
  jobs. Do not invent remote resources or report successful provisioning/deletion.
  Preserve customer AI, SSO, Data Sources, webhooks and custom proxies.
- Add or adapt a discriminating helper regression using invalid/absent keys,
  unavailable remote service, untouched persistence or preserved customer
  connectivity as relevant. Follow the repository's test boundaries.
- Trace callers again, then update obsolete locator/test bindings and documentation.
  Remove retired code only after checking callers. Do not disable a check or leave
  a dead compatibility export merely to keep the previous tests green.
- Run `pnpm fork:check`, `pnpm fork:test`, affected type checks and changed-file
  lint/format checks. If the scanner cannot detect a newly introduced failure,
  add a focused tripwire where useful and describe its limits.

Report the repaired contract, current entrypoint and boundary, validation and any
remaining coverage gap. Stay within the requested repair; this skill does not
request a version upgrade, deployment, remote cancellation or publication.

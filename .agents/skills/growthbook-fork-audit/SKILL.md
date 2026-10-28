---
name: growthbook-fork-audit
description: Audit whether a GrowthBook fork still grants local Enterprise access and avoids license, billing and managed-service dependencies after code moves, refactors or upgrades. Use for a preservation review or regression diagnosis; reports findings without changing application code.
---

# Audit fork behavior

Resolve the active repository and read its `AGENTS.md` and
`.agents/guides/fork-policy.md` ([versioned policy](../../guides/fork-policy.md)).
Use the active checkout's policy when this skill is installed through a symlink.
Inspect the working tree as well as HEAD; do not assume pending changes are saved
in a commit. Bind comparison refs if the user supplied an upgrade range.

This is a read-only audit of application code. Run local checks as appropriate,
but do not contact a real managed-service endpoint or repair a finding implicitly.

For each E1–P2 contract:

1. Find its live entrypoints from router/job registration and UI data providers.
   Follow imports, barrels, wrappers and injected clients to the actual resolver,
   permission gate, persistence boundary or outbound transport.
2. Inspect newly added or moved implementations across the whole change range.
   Look for network clients, endpoint configuration, license cache/usage jobs and
   direct plan reads under new names. Search terms from old code are clues only.
3. Compare expected behavior to actual code and relevant tests. Confirm the tests
   target the active path. If an obsolete helper remains green while callers use
   a new implementation, report a coverage gap or regression, not a pass.
4. Run `pnpm fork:check` and `pnpm fork:test` when dependencies are available.
   Distinguish recognized violations, stale bindings, setup failures and unchecked
   behavior. A missing path requires tracing its replacement; recreating that path
   is not an audit remedy.

Return a compact contract → entrypoint/implementation → test → result map.
Prioritize concrete findings with file references and the trigger/impact. Include
preserved customer integrations and permission checks as positive controls. Name
new or renamed paths that need coverage and the bounded repair needed. Do not
claim all network paths are safe from the scanner alone, and do not change the
policy to make an implementation appear compliant.

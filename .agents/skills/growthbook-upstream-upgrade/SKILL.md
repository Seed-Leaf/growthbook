---
name: growthbook-upstream-upgrade
description: Integrate a requested upstream GrowthBook release into this fork while preserving local Enterprise entitlements and disabled GrowthBook managed-service calls across moves and refactors. Use for version upgrades, upstream merges and rebases; not for ordinary feature changes.
---

# Upgrade the GrowthBook fork

Use the active checkout, not the installation path of this skill. Read its
`AGENTS.md` and [fork policy](../../guides/fork-policy.md); when invoked from a
linked personal skill, resolve `.agents/guides/fork-policy.md` in the active
repository. If the policy is absent, identify the intended fork before editing.

- Bind the requested target to an actual upstream commit/tag. Inspect remotes
  before fetching; `origin` is not necessarily our publishing remote. Record
  fork HEAD, target and merge base. Resolve a genuinely unspecified target before
  choosing a version on the user's behalf.
- Inventory dirty and untracked work. Preserve it. A worktree from HEAD omits
  uncommitted fork policy changes: carry the necessary reviewed changes into the
  integration workspace or work in place without discarding them. Never resolve
  this by a destructive reset or by blindly stashing unrelated work.
- Compare the complete upstream change, including renames. Rebuild the E1–P2
  role map from current route/job/UI entrypoints, not from old path names. Review
  new auth, plan, usage, billing and network abstractions even in clean merges.
- Integrate using the repository's current architecture. Resolve conflicts by
  behavior, retaining upstream security fixes and unrelated changes. Do not keep
  an entire old file merely because it previously contained our patch.
- Trace the new call graph after integration. Move the fork behavior to the new
  authoritative resolver/guard when upstream replaced it. Verify that tests
  exercise live consumers rather than dead compatibility exports.
- Rebind `scripts/fork-policy.json` and navigation hints only after tracing their
  replacements. Run `pnpm fork:check`, `pnpm fork:test`, affected type checks and
  required lint/format/build checks. Scanner silence is not proof of preservation.

Report target/fork revisions, E1–P2 coverage with current code/test references,
conflict decisions, changed bindings and actual validation. Clearly identify
unresolved behavior or coverage. Do not deploy, force-push or publish merely
because this skill was invoked; follow the user's existing authorization.

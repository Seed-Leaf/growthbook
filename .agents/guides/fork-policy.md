# GrowthBook fork policy

This fork intentionally grants Enterprise entitlements locally and disables
GrowthBook license, billing and managed-service control-plane requests. These
are product decisions, not temporary workarounds to remove during an upstream
upgrade. Preserve the behavior below unless the user explicitly changes it.

This policy governs our application behavior. Keep upstream copyright notices,
license texts and the existing dependency-license checks intact.

## Behavior contracts

| ID  | Contract                                                                                                                                                                                                                                 | Evidence to collect after an upgrade                                                                                                                                                                                  |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | The actual and effective account plans are Enterprise, without a key, in both Cloud and self-hosted modes. Legacy flags, stored keys, expired licenses and environment keys must not downgrade the plan.                                 | Trace the current plan resolver from the organization API and a protected operation; exercise absent and invalid keys in both deployment modes.                                                                       |
| E2  | Local feature availability comes from the Enterprise feature set, with consistent front-end and back-end decisions. Plan-based project, environment and role limits must not regress to free-tier defaults.                              | Follow the effective plan through the feature catalog, organization response and UI context. Review new Enterprise features rather than pinning today's feature count or blindly returning true for every capability. |
| L1  | Normal requests and jobs have no license initialization, verification, cache refresh, renewal or license-server dependency. Existing keys can remain stored but are inert. License lookup exposes no fabricated license or subscription. | Follow login, session/API/PAT authentication, organization loading, invitations, membership changes, Slack identity and scheduled-job context creation. Check cold start as well as warm-cache paths.                 |
| M1  | GrowthBook-managed billing, trials, license management, warehouse operations and Event Forwarder provisioning/lifecycle operations are unavailable without outbound control-plane traffic.                                               | Trace all transports, including direct HTTP, SDK clients, alternate endpoints, Vercel billing adapters and deferred retries. A renamed HTTP helper does not change this contract.                                     |
| M2  | Disabled operations cannot pretend to succeed or create pending resources first. Read/status responses must not claim a remote operation succeeded. Existing managed resources are not automatically deleted remotely.                   | Check failure before local writes, warehouse table creation, credential forwarding and job enqueueing; inspect UI setup actions and direct API calls.                                                                 |
| J1  | License polling and managed-warehouse synchronization are not scheduled. Previously persisted jobs cannot reintroduce outbound calls. GrowthBook Cloud Proxy updates are disabled.                                                       | Inspect registrations, startup cleanup, queued-job bodies and retry handlers. Preserve customer-hosted proxy updates.                                                                                                 |
| U1  | Settings show Enterprise without key entry, renewal or subscription checkout requirements. Managed Warehouse and Event Forwarder setup clearly indicate unavailability.                                                                  | Follow current settings routes and setup eligibility; also check direct links and old clients calling retained endpoints.                                                                                             |
| P1  | Authentication, organization membership, project/environment permissions, confirmations and secret handling remain enforced.                                                                                                             | Inspect guards independently of plan checks. Enterprise access is never equivalent to admin access.                                                                                                                   |
| P2  | AI providers, SSO/SCIM configuration, customer Data Sources, webhooks and customer-hosted proxies retain their normal integrations and configuration requirements.                                                                       | Verify representative positive paths; do not blanket-disable fetch, network access, SSO or SQL connectors.                                                                                                            |

The removed external scope is the license/billing/managed-service control plane
and the automatic GrowthBook Cloud Proxy push. This is not an air-gap policy.
Application feature-flag CDN reads and general product telemetry are separate
systems; do not describe this policy as blocking every GrowthBook domain. Change
those systems only when the task includes them.

## Preserve semantics across moves and refactors

File names and function names below are **last-known navigation hints**, not
contracts. A moved, split or replaced implementation must be re-mapped, not copied
back to its old location to satisfy a check.

Before accepting an upstream integration:

1. Record the starting fork revision, chosen upstream revision, merge base and
   relevant dirty/untracked changes. Inspect remotes: `origin` may still point
   to `growthbook/growthbook`, not our fork. A worktree created from HEAD alone
   will not contain uncommitted fork changes.
2. Inspect the complete upstream diff, including renames and changes outside
   `enterprise/`. Use `git diff --find-renames <base> <target>` and search new
   routes, request contexts, model hooks, workers, shared catalogs and UI data
   providers. Do not restrict the review to files touched by our first patch.
3. Reconstruct the **current reachable call graph** for each contract. Start at
   active router registrations, auth middleware, job registrations and rendered
   UI providers. Follow imports/re-exports, dependency injection and wrappers to
   the implementation that actually executes. Inspect newly introduced network
   clients and service URLs even if none of the old names survive.
4. Make an old-role → new-role map. For each contract record the entrypoint,
   resolver or guard, transport/scheduler where relevant, and regression test.
   Classify it as preserved, moved, replaced, regressed or unresolved, with code
   references. An old helper that still passes its tests but has no live callers
   is **not** evidence of preservation.
5. Adapt the local behavior at the new authoritative boundary. Keep upstream
   security fixes, new types, new features and unrelated functionality. Avoid
   whole-file `ours`/`theirs` choices or replaying the old patch verbatim. Audit
   clean merges too: absence of text conflicts says nothing about these contracts.
6. Rebind tests and the locator manifest to the real implementation. Add a
   discriminating regression for a newly found path. Do not make checks pass by
   recreating dead exports, skipping failing tests, weakening expectations or
   broadening exclusions. A removed route may legitimately retire a test only
   after proving no replacement serves that role.
7. Run the checks below and report unresolved coverage separately from proven
   regressions. Update this guide's navigation hints when they change. Never
   declare the fork preserved solely because a text scan or old unit tests pass.

Do not convert every license-related return value to the string `"enterprise"`.
Plan functions return plans; feature predicates return booleans; an empty error
string means success; legacy license lookup returns null. Preserve caller types
and meaningful unavailable responses through refactors.

## Current navigation map

Resolve these paths in the checkout being worked on. `scripts/fork-policy.json`
contains the maintained scan/test bindings; a missing binding is a coverage gap
requiring investigation, not proof that the product behavior regressed.

| Role                                   | Current starting point                                                                                                                                         |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local plan and feature resolution      | `packages/back-end/src/enterprise/licenseUtil.ts`, `packages/shared/src/enterprise/license-consts.ts`                                                          |
| Plan-derived limits                    | `packages/back-end/src/services/plan-limits.ts`, `packages/shared/src/enterprise/entitlements.ts`                                                              |
| Live server feature gate               | `packages/back-end/src/services/context.ts`                                                                                                                    |
| Organization response → UI             | `packages/back-end/src/routers/organizations/organizations.controller.ts` → `packages/front-end/services/UserContext.tsx`                                      |
| Authentication and background contexts | `services/auth/`, `middleware/authenticateApiRequestMiddleware.ts`, `services/organizations.ts`, `services/slack/slackIdentity.ts` under back-end `src/`       |
| Explicit managed-service refusal       | `packages/back-end/src/enterprise/managedServices.ts`; retained typed adapters in `enterprise/licenseUtil.ts` and `services/licenseServerManagedClickhouse.ts` |
| Billing and license routes             | `packages/back-end/src/controllers/subscription.ts`, `packages/back-end/src/controllers/license.ts`                                                            |
| Guard before managed-resource writes   | Back-end `controllers/datasources.ts`, `models/DataSourceModel.ts`, `services/eventForwarder/config.ts`, `services/eventForwarder/connector.ts`                |
| Schedulers and proxy distinction       | `packages/back-end/src/init/queue.ts`, `packages/back-end/src/jobs/proxyUpdate.ts`                                                                             |
| Settings and setup eligibility         | Front-end `components/License/ShowLicenseInfo.tsx`, `pages/settings/billing.tsx`, `components/DataSourceSetup/useDataSourceOptionEligibility.ts`               |

Retained names such as `postProvisionEventForwarderToLicenseServer` can be typed
unavailable adapters. Their names alone are not evidence of an outbound request.
Likewise, source files under `enterprise/` are not all license enforcement code.

## Deployment-specific preservation

The root Dockerfile uses public Node/Python images and must not regain a DHI
registry dependency during an upstream merge. Preserve non-root uid 1000, native
module compatibility and the Python statistical engine. See `deploy/README.md`.
For installations setting `SSO_GOOGLE_WORKSPACE_DOMAINS`, preserve the verified
Google issuer, email and hosted-domain checks before user lookup;
`SSO_CONFIG.emailDomains` alone is only an organization auto-join setting.

## Validation

After installing dependencies and building shared dependencies as required:

```bash
pnpm fork:check
pnpm fork:test
pnpm --filter back-end type-check
pnpm --filter front-end type-check
```

Run changed-file lint/format checks and upstream-required checks too. Expand
coverage for new architecture, permission or integration changes; avoid rerunning
unrelated suites without a reason. Follow repository testing policy: new tests
belong in utilities/helpers, not front-end components or routers/models. Existing
regressions may be maintained as needed.

`fork:check` runs scanner self-tests and scans production JS/TS across the
checkout, not only historical package locations. It catches known forbidden
symbols/hosts and direct network dependencies in the currently bound adapters.
It exits 1 for recognized policy violations and 2 for stale/incomplete bindings.
It is a conservative tripwire, **not** network instrumentation or proof against
renamed/dynamic/transitive transports. The audit must review imports, runtime
entrypoints, jobs and new clients. No real managed-service endpoint should be
called to validate that it is disabled.

`fork:test` verifies that every listed regression exists and runs it by exact
path. Paths and test totals are not immutable; when tests move, rebind them based
on coverage of E1–P2 and the live call graph. A green suite against obsolete
compatibility wrappers does not complete the audit.

The existing CI checks run the tripwire and the back-end test suite. Keep these
checks wired into both CI and the local `ci` command when merging workflow or
package-script updates. Do not remove the independent dependency-license job.

## Skills and completion evidence

Versioned skill sources live under `.agents/skills/`:

- `growthbook-upstream-upgrade`: integrate a specified upstream version while
  preserving these contracts.
- `growthbook-fork-audit`: inspect a checkout or change range without repairing it.
- `growthbook-fork-repair`: repair an identified regression in the current
  architecture without doing an unrelated upgrade.

They may also be linked from the user's Codex skills directory for discovery.
The versioned copies are authoritative; never maintain separate divergent copies.
Resolve the active repository first when a skill is used from another worktree.
On a new machine, repository `AGENTS.md` links to the skill sources even before
personal discovery links have been installed.

For an upgrade or audit, include the compared revisions, contract-to-code/test
map, actual check results, remaining coverage gaps and changed bindings. Keep
this evidence in the requested review/PR or task response; do not fabricate an
upstream version or imply a deploy/push was performed. A repair task can finish
with local changes and validation; publication follows the user's task scope.

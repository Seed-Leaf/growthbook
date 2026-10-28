# Moulder GrowthBook deployment

Deploy `dokploy.compose.yml` through Dokploy on `mld-platform-01`
(`dleap-429706`, `asia-northeast3-a`), in `internal / production`.
Dokploy owns configuration, secrets, domains and deployment lifecycle.

Build the fork's root Dockerfile for `linux/amd64`, publish it to the existing
`asia-northeast3-docker.pkg.dev/dleap-429706/backend/growthbook` repository path,
and deploy its immutable digest. The Dockerfile uses public Docker Official
Images (Node 24 and Python 3.11, Debian 12), with a non-root uid 1000 runtime.
It does not use DHI. Re-check the native Kerberos module and statistical engine
when changing the base images.

MongoDB 7.0 is used on this host. The first MongoDB 8.0 image exited before
opening the database because of its Linux kernel compatibility check
([SERVER-121912](https://jira.mongodb.org/browse/SERVER-121912)). Do not bypass
that check or change the shared host kernel as part of an application release.
Reassess a supported MongoDB upgrade before
[7.0 reaches end of life on August 31, 2027](https://www.mongodb.com/legal/support-policy/lifecycles).
Once data exists, follow MongoDB's upgrade procedure; changing an image tag is
not a database downgrade procedure.

Before building, check out `packages/back-end/agent-skills.lock.json`'s repository
at its pinned revision into `skills-src`, and populate `buildinfo/SHA` and
`buildinfo/DATE`. Run fork checks and affected tests before publishing. Do not use
the upstream `growthbook/growthbook` image: it does not contain our policy.

Create two Dokploy domains on the `growthbook` service, with HTTPS:

- `growthbook.moulder.dev` → port 3000
- `growthbook-api.moulder.dev` → port 3100

Use native GrowthBook OIDC login. Do not place interactive forward-auth in front
of the API, since SDK and API-key clients need direct access. Native authentication
and permissions still protect application operations.

Product telemetry is disabled in this deployment. This setting does not disable
GrowthBook's own application feature-flag CDN reads; those remain outside the
fork's license and managed-service control-plane policy.

Set `GROWTHBOOK_IMAGE`, `MONGO_IMAGE`, `MONGO_PASSWORD`, `JWT_SECRET`,
`ENCRYPTION_KEY` and `SSO_CONFIG` in the Compose service's Dokploy environment.
Use a URL-safe database password because it is interpolated into the Mongo URI.
Keep secrets out of Git. The Google OIDC callback is
`https://growthbook.moulder.dev/oauth/callback`; reuse the internal Workspace
provider without removing callbacks used by other applications.

`SSO_CONFIG.emailDomains` controls automatic organization joining, not a login
allowlist. `SSO_GOOGLE_WORKSPACE_DOMAINS=moulder.ai` enforces verified Google
claims with both the exact email domain and hosted-domain (`hd`) claim before
user lookup. An empty setting preserves upstream authentication behavior.

The two named volumes contain MongoDB data and uploaded files. Never recreate
volumes during normal redeployment. Back up these plus the stable encryption key
before upgrades; restoring only the database does not recover encrypted datasource
credentials without that key. Do not claim backups are configured until a
scheduled backup and restore have actually been verified.

Verify the image digest, non-root uid, container health, Mongo authentication,
Python imports, API `/healthcheck`, UI HTTPS and actual Google login. The health
endpoint is a liveness check, not proof of database readiness or successful SSO.
For rollback select the preceding image digest while preserving volumes and
secrets; assess data migrations before rolling an application version back.

## Deployment record — October 28, 2026

- Dokploy Compose: `s5WaAVPewXr_VuCA-txfa` (`internal-growthbook-2qfi4r`).
- Successful deployment: `9NjW-mWfrOEfJRixiVtLw`.
- Application source: `dc2eca4044f0eca908537cd81d14dc1c8445a926` on `Seed-Leaf/growthbook`.
- Application image: `asia-northeast3-docker.pkg.dev/dleap-429706/backend/growthbook@sha256:aea4bdb1ba3b650e1fa335a4df07e9d73d943abff6938a42842fc94428aa97a6`.
- MongoDB image: `mongo:7.0@sha256:8bb4442761a63a8dda452744082cdac9644b429807eb977b42324a63cef59ca4`.
- DNS: both hostnames resolve directly to `34.64.40.180`; Dokploy manages Let's Encrypt certificates.
- Data volumes: `internal-growthbook-2qfi4r_mongodata` and `internal-growthbook-2qfi4r_uploads`.
- Organization: `org_120itqsdmvrqqz9l`; initial owner `yonghoon.do@moulder.ai`.

Verified: 17 regression suites / 83 tests; backend type-check and changed-file
lint; complete amd64 image build; runtime Python import guard, Kerberos and
isolated-vm imports, uid 1000 and upload write access. Both deployed containers
are healthy. MongoDB is attached only to the Compose private network and neither
container publishes host ports. HTTPS UI and API health return 200; the SDK route
returns an API error for an invalid key without an interactive login redirect;
unauthenticated internal API access returns 401. Actual Google Workspace login
succeeded and General Settings displays Enterprise without a license key.

Scheduled volume backups and restore rehearsal are not configured. Application
SDK connections and flag rollout in moulder-backend / engine-worker are separate
integration work; this release deploys the management service.

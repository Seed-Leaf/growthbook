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

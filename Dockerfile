# syntax=docker/dockerfile:1@sha256:ecfaec9ed6d810b56388c508f4121597bfbba70d41a6dfeee4d8cad5f295fc32
# Public Docker Official Images only. Keep every stage on Debian 12 so native
# Node modules and the Python venv have the same ABI at build and runtime.
ARG PYTHON_IMAGE=python:3.11-slim-bookworm@sha256:ef521de1d817dc92a6358c906bbadb9a0b7e38040038642833521b9d582c2233
ARG NODE_IMAGE=node:24.22.1-bookworm-slim@sha256:be8204d4bd327363357f532187b752ff62759c31bedf98e9e18fc08c9cbd605c

FROM ${PYTHON_IMAGE} AS pybuild
ARG UPGRADE_PIP="true"
WORKDIR /usr/local/src/app
COPY ./packages/stats .
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="/opt/venv/bin:${PATH}"
RUN if [ "$UPGRADE_PIP" = "true" ]; then pip install --upgrade pip; fi \
  && pip install --no-cache-dir poetry==1.8.5 \
  && poetry install --no-root --without dev --no-interaction --no-ansi \
  && poetry build \
  && poetry export -f requirements.txt --output requirements.txt \
  && pip install --no-cache-dir -r requirements.txt \
  && pip install --no-cache-dir dist/*.whl ddtrace==4.8.2
RUN pip uninstall -y $(python -c "from check_stripped_deps import STRIPPED; print(*STRIPPED)") \
  && python check_stripped_deps.py

FROM ${NODE_IMAGE} AS nodebuild
WORKDIR /usr/local/src/app
ARG NODE_OPTIONS="--max-old-space-size=8192"
ENV NODE_OPTIONS="${NODE_OPTIONS}"
RUN apt-get update && \
  apt-get install -y --no-install-recommends build-essential python3 ca-certificates libkrb5-dev && \
  npm install -g pnpm@10.33.4 node-gyp && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*
COPY patches ./patches
COPY pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm fetch
COPY .npmrc ./.npmrc
COPY package.json ./package.json
COPY pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY packages/front-end/package.json ./packages/front-end/package.json
COPY packages/back-end/package.json ./packages/back-end/package.json
COPY packages/sdk-js/package.json ./packages/sdk-js/package.json
COPY packages/sdk-react/package.json ./packages/sdk-react/package.json
COPY packages/remote-saved-groups-csv-parser/package.json ./packages/remote-saved-groups-csv-parser/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/stats-ts/package.json ./packages/stats-ts/package.json
# Install dependencies using cached store
# GB_SKIP_PREPARE: sdk-js and remote-saved-groups-csv-parser build themselves in
# "prepare" for Git dependency installs; here their sources aren't copied yet,
# and `pnpm build` builds them below.
RUN GB_SKIP_PREPARE=1 pnpm install --frozen-lockfile --offline

# Compile kerberos from source (its prebuilt binary crashes at require time on
# the runtime); before COPY packages so the layer caches per-lockfile.
RUN pnpm rebuild kerberos

COPY packages ./packages
COPY skills-src ./skills-src
# Prod-only tree in place: install --prod re-links the workspace projects (CI=true
# auto-confirms the no-TTY purge; .pnpm is kept), prune then drops dev deps from
# .pnpm. prune alone empties the workspace projects' node_modules (pnpm 10).
RUN \
  pnpm build \
  && test -f packages/back-end/dist/server.js || (echo "ERROR: packages/back-end/dist/server.js is missing after build!" && exit 1) \
  && rm -rf packages/front-end/.next/cache \
  && CI=true GB_SKIP_PREPARE=1 pnpm install --frozen-lockfile --offline --prod --no-optional \
  && CI=true pnpm prune --prod --no-optional \
  && find node_modules \( -name "*.md" -o -name "*.map" -o -name "CHANGELOG*" -o -name "README*" -o \( -name "*.ts" ! -name "*.d.ts" \) \) -type f -delete \
  && find node_modules -type d -name benchmarks -prune -exec rm -rf {} + \
  && rm -f packages/stats/poetry.lock

# Drop front-end TS source + tsconfig so `next start` never tries to enable
# TypeScript at runtime. The stock image did this in a final-stage RUN; the
# runtime does not need these build inputs.
RUN rm -f packages/front-end/tsconfig.json && \
    find packages/front-end -maxdepth 1 -name "*.ts" -delete && \
    find packages/front-end -maxdepth 1 -name "*.tsx" -delete

# Assert the from-source kerberos.node survived the prod re-link and prune.
RUN find node_modules/.pnpm -path '*/kerberos/build/Release/kerberos.node' -type f | grep -q . \
  || (echo "ERROR: kerberos.node missing from the prod node_modules tree" && exit 1)

# pm2-runtime compatibility shims. Both paths are baked into already-published Helm
# charts and into ECS task defs that pin them, so an old config deploying a new image
# must still boot. Each is a plain-Node file (not the #!/bin/sh shim pm2 installed,
# which can't exec in the shell-less runtime) that re-executes our supervisor; it
# accepts the same `start ecosystem.config.js [--only <app>]` argv. The current
# chart/CMD call scripts/run-apps.js directly and don't depend on these.
RUN mkdir -p node_modules/pm2/bin node_modules/.bin && \
    printf '#!/usr/bin/env node\nrequire("../../../scripts/run-apps.js");\n' \
      > node_modules/pm2/bin/pm2-runtime && \
    chmod +x node_modules/pm2/bin/pm2-runtime && \
    printf '#!/usr/bin/env node\nrequire("../../scripts/run-apps.js");\n' \
      > node_modules/.bin/pm2-runtime && \
    chmod +x node_modules/.bin/pm2-runtime

# Stage an empty uploads dir OUTSIDE the packages tree so the broad `COPY packages`
# in the final stage doesn't create (root-owned) uploads first; the final stage then
# COPYs this in with --chown=1000:1000 (see there).
RUN mkdir -p /uploads

FROM ${PYTHON_IMAGE} AS runtime
WORKDIR /usr/local/src/app
# The Python base already supplies the interpreter and stdlib used by pybuild.
# Kerberos dlopens libgssapi at runtime, so it must be installed explicitly.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates libstdc++6 libatomic1 libgssapi-krb5-2 \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --gid 1000 growthbook \
  && useradd --uid 1000 --gid 1000 --create-home growthbook
COPY --from=nodebuild /usr/local/bin/node /usr/local/bin/node
COPY --from=pybuild /opt/venv /opt/venv
ENV VIRTUAL_ENV=/opt/venv
ENV PATH="/opt/venv/bin:/usr/local/bin:/usr/local/sbin:/usr/bin:/bin"
ENV PYTHONDONTWRITEBYTECODE=1 NEXT_TELEMETRY_DISABLED=1 NODE_ENV=production
COPY --from=nodebuild /usr/local/src/app/packages ./packages
COPY --from=nodebuild /usr/local/src/app/node_modules ./node_modules
COPY --from=nodebuild /usr/local/src/app/package.json ./package.json
COPY --from=nodebuild --chown=1000:1000 /uploads ./packages/back-end/uploads
COPY ecosystem.config.js ./ecosystem.config.js
COPY scripts/run-apps.js ./scripts/run-apps.js
COPY buildinfo* ./buildinfo
ARG DD_GIT_COMMIT_SHA=""
ARG DD_GIT_REPOSITORY_URL=https://github.com/Seed-Leaf/growthbook.git
ARG DD_VERSION=""
ENV DD_GIT_COMMIT_SHA=$DD_GIT_COMMIT_SHA \
    DD_GIT_REPOSITORY_URL=$DD_GIT_REPOSITORY_URL \
    DD_VERSION=$DD_VERSION
USER 1000:1000
EXPOSE 3000 3100
CMD ["/usr/local/bin/node", "scripts/run-apps.js", "start", "ecosystem.config.js"]

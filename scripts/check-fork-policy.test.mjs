import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { bindingGaps, checkForkPolicy } from "./check-fork-policy.mjs";

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "growthbook-fork-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (path, content) => {
    const target = join(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  };
  write("apps/api/src/plan.ts", 'export const plan = () => "enterprise";');
  write("apps/api/test/plan.test.ts", "// Existing regression binding");
  write("apps/api/package.json", "{}");
  const policy = {
    schemaVersion: 1,
    isolatedModules: { "local-plan": "apps/api/src/plan.ts" },
    testProject: "apps/api",
    tests: ["apps/api/test/plan.test.ts"],
  };
  return { root, write, policy };
}

test("retained unavailable adapter names and customer integrations are allowed", (t) => {
  const { root, write, policy } = fixture(t);
  write(
    "apps/api/src/plan.ts",
    `
    export const postProvisionEventForwarderToLicenseServer = () => { throw new Error("Unavailable"); };
  `,
  );
  write("services/customer.ts", 'fetch("https://customer.example/warehouse");');
  assert.deepEqual(checkForkPolicy(root, policy), {
    files: 2,
    violations: [],
    gaps: [],
  });
});

test("a new package cannot hide known licensing imports behind an alias", (t) => {
  const { root, write, policy } = fixture(t);
  write(
    "services/new-auth/session.mts",
    'import { licenseInit as bootstrap } from "./access"; bootstrap();',
  );
  const result = checkForkPolicy(root, policy);
  assert.deepEqual(
    result.violations.map((v) => [v.file, v.rule]),
    [["services/new-auth/session.mts", "known-license-symbol"]],
  );
});

test("renamed clients with known control-plane hosts and computed symbol access are detected", (t) => {
  const { root, write, policy } = fixture(t);
  write(
    "apps/worker/new-client.ts",
    'remote["callLicenseServer"](`https://central-license-server.growthbook.io/${org}`);',
  );
  assert.deepEqual(
    checkForkPolicy(root, policy)
      .violations.map((v) => v.rule)
      .sort(),
    ["known-license-symbol", "known-management-host"],
  );
});

test("comments, declaration files, test fixtures and root tooling are excluded", (t) => {
  const { root, write, policy } = fixture(t);
  write(
    "apps/api/src/comment.ts",
    "// licenseInit(); https://proxy.growthbook.io\nexport const value = 1;",
  );
  for (const path of [
    "apps/api/test/old.ts",
    "apps/api/src/old.test.ts",
    "apps/api/src/old.d.ts",
    "scripts/old.mjs",
  ]) {
    write(path, "licenseInit();");
  }
  assert.equal(checkForkPolicy(root, policy).violations.length, 0);
});

test("local adapters reject direct network modules and global fetch", (t) => {
  const { root, write, policy } = fixture(t);
  write(
    "apps/api/src/plan.ts",
    'const client = require("node:https"); globalThis.fetch("https://new-host.example");',
  );
  assert.deepEqual(
    checkForkPolicy(root, policy).violations.map((v) => v.rule),
    ["network-dependency-in-local-adapter", "fetch-in-local-adapter"],
  );
});

test("moving an adapter requires rebinding, not restoring an obsolete file", (t) => {
  const { root, write, policy } = fixture(t);
  rmSync(join(root, "apps/api/src/plan.ts"));
  write(
    "services/access/resolver.ts",
    'export const plan = () => "enterprise";',
  );
  const stale = checkForkPolicy(root, policy);
  assert.equal(stale.violations.length, 0);
  assert.match(stale.gaps[0], /Missing binding/);
  policy.isolatedModules["local-plan"] = "services/access/resolver.ts";
  assert.deepEqual(checkForkPolicy(root, policy).gaps, []);
});

test("missing regressions and empty bindings cannot silently pass", (t) => {
  const { root, policy } = fixture(t);
  policy.tests.push("apps/api/test/moved.test.ts");
  assert.match(bindingGaps(root, policy)[0], /Missing binding/);
  assert.match(
    bindingGaps(root, { ...policy, tests: [] })[0],
    /Invalid or empty/,
  );
});

test("an existing adapter moved outside scanned sources is a coverage gap", (t) => {
  const { root, write, policy } = fixture(t);
  write("scripts/adapter.ts", 'export const plan = () => "enterprise";');
  policy.isolatedModules["local-plan"] = "scripts/adapter.ts";
  assert.match(
    checkForkPolicy(root, policy).gaps[0],
    /outside scanned sources/,
  );
});

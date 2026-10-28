import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bindingGaps, readPolicy } from "./check-fork-policy.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
try {
  const policy = readPolicy(root);
  const gaps = bindingGaps(root, policy);
  if (gaps.length) {
    process.stderr.write(
      `${gaps.join("\n")}\nTrace replacements and rebind coverage before running the suite.\n`,
    );
    process.exitCode = 2;
  } else {
    const result = spawnSync(
      "pnpm",
      [
        "--dir",
        resolve(root, policy.testProject),
        "test",
        "--runInBand",
        "--runTestsByPath",
        ...policy.tests.map((path) => resolve(root, path)),
      ],
      { stdio: "inherit" },
    );
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  }
} catch (error) {
  process.stderr.write(
    `Fork regression runner could not complete: ${error.message}\n`,
  );
  process.exitCode = 2;
}

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const forbiddenSymbols = new Set([
  "licenseInit",
  "LICENSE_SERVER_URL",
  "callLicenseServer",
  "getLicenseDataFromServer",
  "updateLicenseFromServer",
  "verifyAndSetServerLicenseData",
]);
const forbiddenHost = /\b(?:central-license-server|proxy)\.growthbook\.io\b/i;
const networkModule =
  /^(?:node:)?(?:https?|http2|net|tls)$|^(?:node-fetch|axios|undici|got)(?:\/|$)|(?:^|\/)util\/http\.util(?:\.[cm]?[jt]s)?$/;
const excludedDirectories = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "coverage",
  "test",
  "tests",
  "__tests__",
  "__mocks__",
  ".jest-cache",
]);
const excludedRootDirectories = new Set([
  ".agents",
  ".github",
  "docs",
  "scripts",
  "eslint-rules",
  "skills-src",
]);
const sourceExtension = /\.[cm]?[jt]sx?$/;
const nonRuntimeFile =
  /(?:\.d\.[cm]?ts|\.(?:test|spec|stories)\.[cm]?[jt]sx?)$/;

function* sourceFiles(root, directory = root) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (excludedDirectories.has(entry.name)) continue;
      if (directory === root && excludedRootDirectories.has(entry.name))
        continue;
      yield* sourceFiles(root, path);
    } else if (
      entry.isFile() &&
      sourceExtension.test(entry.name) &&
      !nonRuntimeFile.test(entry.name)
    ) {
      yield path;
    }
  }
}

export function readPolicy(root) {
  return JSON.parse(
    readFileSync(join(root, "scripts/fork-policy.json"), "utf8"),
  );
}

export function bindingGaps(root, policy) {
  if (
    policy?.schemaVersion !== 1 ||
    !policy.isolatedModules ||
    Array.isArray(policy.isolatedModules) ||
    typeof policy.isolatedModules !== "object" ||
    Object.keys(policy.isolatedModules).length === 0 ||
    typeof policy.testProject !== "string" ||
    !Array.isArray(policy.tests) ||
    policy.tests.length === 0
  )
    return ["Invalid or empty fork policy bindings"];
  const paths = [
    ...Object.values(policy.isolatedModules),
    ...policy.tests,
    typeof policy.testProject === "string"
      ? join(policy.testProject, "package.json")
      : null,
  ];
  return paths.flatMap((path) => {
    if (typeof path !== "string" || !path) return ["Invalid path binding"];
    const absolute = resolve(root, path);
    if (relative(root, absolute).startsWith(".."))
      return [`Binding outside checkout: ${path}`];
    try {
      return statSync(absolute).isFile() ? [] : [`Not a file: ${path}`];
    } catch {
      return [`Missing binding: ${path}`];
    }
  });
}

export function checkForkPolicy(root, policy) {
  const gaps = bindingGaps(root, policy);
  if (gaps.length) return { files: 0, violations: [], gaps };
  const isolated = new Set(
    Object.values(policy.isolatedModules).map((path) => resolve(root, path)),
  );
  const violations = [];
  const scanned = new Set();
  for (const path of sourceFiles(root)) {
    scanned.add(path);
    const source = ts.createSourceFile(
      path,
      readFileSync(path, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    const add = (node, rule) => {
      const { line } = source.getLineAndCharacterOfPosition(
        node.getStart(source),
      );
      violations.push({ file: relative(root, path), line: line + 1, rule });
    };
    const visit = (node) => {
      const literal =
        ts.isStringLiteralLike(node) ||
        ts.isTemplateHead(node) ||
        ts.isTemplateMiddle(node) ||
        ts.isTemplateTail(node);
      if ((ts.isIdentifier(node) || literal) && forbiddenSymbols.has(node.text))
        add(node, "known-license-symbol");
      if (literal && forbiddenHost.test(node.text))
        add(node, "known-management-host");
      if (isolated.has(path)) {
        // Literal module names also catch require(), import(), and re-exports.
        if (literal && networkModule.test(node.text))
          add(node, "network-dependency-in-local-adapter");
        if (ts.isCallExpression(node)) {
          const target = node.expression;
          const name = ts.isIdentifier(target)
            ? target.text
            : ts.isPropertyAccessExpression(target)
              ? target.name.text
              : null;
          if (name === "fetch") add(node, "fetch-in-local-adapter");
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  for (const path of isolated) {
    if (!scanned.has(path))
      gaps.push(
        `Adapter binding is outside scanned sources: ${relative(root, path)}`,
      );
  }
  return { files: scanned.size, violations, gaps };
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  try {
    const result = checkForkPolicy(root, readPolicy(root));
    for (const finding of result.violations) {
      process.stderr.write(
        `${finding.file}:${finding.line}: ${finding.rule}\n`,
      );
    }
    for (const gap of result.gaps)
      process.stderr.write(`Coverage gap: ${gap}\n`);
    process.stdout.write(
      `Fork tripwire: ${result.files} source files, ${result.violations.length} findings, ${result.gaps.length} coverage gaps. Live call-graph review is still required.\n`,
    );
    process.exitCode = result.violations.length
      ? 1
      : result.gaps.length
        ? 2
        : 0;
  } catch (error) {
    process.stderr.write(`Fork check could not complete: ${error.message}\n`);
    process.exitCode = 2;
  }
}

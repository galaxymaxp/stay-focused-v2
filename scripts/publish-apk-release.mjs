#!/usr/bin/env node
import { execFile } from "node:child_process";
import { constants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

// Node >=22.13 (the repository minimum) supports this type-only TS module.
// Import the source of truth rather than duplicating the release grammar.
import { parseReleaseBody, parseReleaseTag } from "../packages/shared/src/app-release.ts";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const DEFAULT_REPO = "galaxymaxp/stay-focused-releases";
const execFileAsync = promisify(execFile);
const VALUE_FLAGS = new Set([
  "apk", "version-name", "version-code", "runtime", "min-supported", "notes-file", "repo",
]);
const SWITCH_FLAGS = new Set(["publish", "allow-app-json-mismatch"]);

export function parseArgs(argv) {
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index].startsWith("--") ? argv[index].slice(2) : "";
    if (!VALUE_FLAGS.has(flag) && !SWITCH_FLAGS.has(flag)) {
      throw new Error(`Unknown argument: ${argv[index]}`);
    }
    if (Object.hasOwn(flags, flag)) throw new Error(`Duplicate flag: --${flag}`);
    if (SWITCH_FLAGS.has(flag)) flags[flag] = true;
    else {
      const value = argv[++index];
      if (!value || value.startsWith("--")) throw new Error(`--${flag} requires a value.`);
      flags[flag] = value;
    }
  }
  for (const flag of ["apk", "notes-file"]) {
    if (!flags[flag]) throw new Error(`--${flag} is required.`);
  }
  return flags;
}

function positiveCode(value, flag) {
  const text = String(value);
  const code = Number(text);
  if (!/^\d+$/.test(text) || !Number.isSafeInteger(code) || code <= 0) {
    throw new Error(`${flag} must be a positive safe integer.`);
  }
  return code;
}

function singleLine(value) {
  return typeof value === "string" && value.trim().length > 0 && !/[\x00-\x1f\x7f]/.test(value);
}

async function requireFile(target, message) {
  try {
    if (!(await fs.stat(target)).isFile()) throw new Error();
  } catch { throw new Error(message); }
}

function httpsArtifact(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error("APK artifact URL must use HTTPS."); }
  if (url.protocol !== "https:" || url.username || url.password || url.hash) {
    throw new Error("APK artifact URL must use HTTPS without credentials or a fragment.");
  }
  return url;
}

export function generateNotes({ versionCode, runtime, minSupported, notes }) {
  return [
    `versionCode: ${versionCode}`,
    `runtime: ${runtime}`,
    ...(minSupported === null ? [] : [`minSupported: ${minSupported}`]),
    "", notes, "",
  ].join("\n");
}

export async function prepareRelease(flags, { root = ROOT, cwd = process.cwd() } = {}) {
  let expo;
  try {
    ({ expo } = JSON.parse(await fs.readFile(path.join(root, "apps/mobile/app.json"), "utf8")));
  } catch { throw new Error("Cannot read apps/mobile/app.json."); }
  if (expo?.android?.runtimeVersion !== undefined && expo.android.runtimeVersion !== expo.runtimeVersion) {
    throw new Error("app.json Android and root runtimeVersion must match before publishing.");
  }
  const defaults = {
    "version-name": expo?.version,
    "version-code": expo?.android?.versionCode,
    runtime: expo?.runtimeVersion,
  };
  const versionName = flags["version-name"] ?? defaults["version-name"];
  const versionCode = positiveCode(flags["version-code"] ?? defaults["version-code"], "versionCode");
  const runtime = flags.runtime ?? defaults.runtime;
  if (typeof versionName !== "string" || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?$/.test(versionName)) {
    throw new Error("versionName must be semver-like (for example 2.2.0), without build metadata.");
  }
  if (!singleLine(runtime) || runtime !== runtime.trim()) {
    throw new Error("runtime must be a non-empty single line without surrounding whitespace.");
  }
  for (const [flag, actual] of [["version-name", versionName], ["version-code", versionCode], ["runtime", runtime]]) {
    if (flags[flag] !== undefined && String(actual) !== String(defaults[flag]) && !flags["allow-app-json-mismatch"]) {
      throw new Error(`--${flag} differs from app.json. Verify the built APK, then pass --allow-app-json-mismatch for EAS remote versioning.`);
    }
  }
  const minSupported = flags["min-supported"] === undefined ? null : positiveCode(flags["min-supported"], "minSupported");
  if (minSupported !== null && minSupported > versionCode) throw new Error("minSupported must be <= versionCode.");
  const repo = flags.repo ?? DEFAULT_REPO;
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\/[A-Za-z0-9_.-]+$/.test(repo) || /\/(?:\.|\.\.)$/.test(repo)) {
    throw new Error("--repo must be owner/repository.");
  }
  let notes;
  try { notes = (await fs.readFile(path.resolve(cwd, flags["notes-file"]), "utf8")).replace(/\r\n/g, "\n").trim(); }
  catch { throw new Error("--notes-file must be a readable plain-text file."); }
  if (!notes || /[\x00-\x08\x0b-\x1f\x7f]/.test(notes)) throw new Error("--notes-file must contain non-empty plain text.");
  const tag = `v${versionName}+${versionCode}`;
  const body = generateNotes({ versionCode, runtime, minSupported, notes });
  const parsedTag = parseReleaseTag(tag);
  const parsedBody = parseReleaseBody(body);
  if (parsedTag?.versionName !== versionName || parsedTag.versionCode !== versionCode ||
      parsedBody.versionCode !== versionCode || parsedBody.runtimeVersion !== runtime ||
      parsedBody.minSupportedVersionCode !== minSupported || parsedBody.notes !== notes) {
    throw new Error("Generated tag/notes do not round-trip through the shared parser. Remove reserved metadata lines from What's new.");
  }
  const assetName = `stay-focused-${versionName}-${versionCode}.apk`;
  const outputDir = path.join(root, ".local/releases");
  const artifactUrl = /^[A-Za-z][A-Za-z\d+.-]*:/.test(flags.apk) && !/^[A-Za-z]:[\\/]/.test(flags.apk)
    ? httpsArtifact(flags.apk).href : null;
  const apkPath = artifactUrl ? path.join(outputDir, assetName) : path.resolve(cwd, flags.apk);
  if (!singleLine(apkPath) || apkPath.includes("#") || !apkPath.toLowerCase().endsWith(".apk")) {
    throw new Error("Local APK path must end in .apk and contain no # or control characters.");
  }
  if (!artifactUrl) await requireFile(apkPath, "Local APK path must exist and be a file ending in .apk.");
  const notesPath = path.join(outputDir, `stay-focused-${versionName}-${versionCode}.notes.txt`);
  const viewArgs = ["release", "view", tag, "--repo", repo];
  const createArgs = ["release", "create", tag, `${apkPath}#${assetName}`, "--repo", repo,
    "--title", `Stay Focused ${versionName}`, "--notes-file", notesPath];
  return { tag, body, artifactUrl, apkPath, notesPath, outputDir, viewArgs, createArgs };
}

// No shell expansion; all local paths/notes are individual argv elements.
export async function runGh(args) {
  return execFileAsync("gh", args, { timeout: 120_000, windowsHide: true, maxBuffer: 1024 * 1024 });
}

export async function assertNewRelease(plan, gh) {
  try { await gh(plan.viewArgs); }
  catch (error) {
    // Treat only gh's explicit missing-release response as absence. Auth,
    // connection failures, missing executable and ambiguous errors stop safely.
    if (error.code === 1 && /^release not found\s*$/i.test(error.stderr?.trim() ?? "")) return;
    throw new Error("Cannot confirm that the release tag is unused. Check gh authentication, repository access and connectivity.");
  }
  throw new Error(`Release ${plan.tag} already exists. Releases are never overwritten or deleted.`);
}

export async function downloadApk(url, destination, { fetchImpl = globalThis.fetch } = {}) {
  const signal = AbortSignal.timeout(10 * 60_000);
  let current = httpsArtifact(url);
  let response;
  // Handle redirects explicitly so HTTPS cannot downgrade to HTTP.
  for (let redirects = 0; redirects <= 10; redirects += 1) {
    response = await fetchImpl(current.href, { redirect: "manual", signal });
    if (![301, 302, 303, 307, 308].includes(response.status)) break;
    await response.body?.cancel();
    const location = response.headers.get("location");
    if (!location || redirects === 10) throw new Error("APK download has an invalid redirect chain.");
    current = httpsArtifact(new URL(location, current).href);
  }
  if (!response.ok || !response.body) {
    await response.body?.cancel();
    throw new Error("APK download failed. Check the artifact URL and try again.");
  }
  const partial = `${destination}.part`;
  let created = false;
  try {
    // Exclusive creation preserves an earlier artifact or interrupted download.
    const handle = await fs.open(partial, "wx");
    created = true;
    await pipeline(Readable.fromWeb(response.body), handle.createWriteStream(), { signal });
    if ((await fs.stat(partial)).size === 0) throw new Error("Downloaded APK is empty.");
    // COPYFILE_EXCL prevents replacing an existing local artifact on Windows too.
    await fs.copyFile(partial, destination, constants.COPYFILE_EXCL);
  } catch {
    throw new Error("APK download failed or the local artifact already exists. No release was created.");
  } finally {
    if (!response.body.locked) await response.body.cancel().catch(() => {});
    if (created) await fs.unlink(partial);
  }
}

export async function main(argv = process.argv.slice(2), {
  root = ROOT, cwd = process.cwd(), gh = runGh, download = downloadApk, log = console.log,
} = {}) {
  const flags = parseArgs(argv);
  const plan = await prepareRelease(flags, { root, cwd });
  log(flags.publish ? "Publish plan:" : "Dry run: no files, network requests or GitHub changes.");
  log(JSON.stringify(["gh", ...plan.createArgs]));
  log(`Generated notes:\n${plan.body}`);
  if (!flags.publish) return plan;
  await assertNewRelease(plan, gh);
  await fs.mkdir(plan.outputDir, { recursive: true });
  if (plan.artifactUrl) {
    try { await download(plan.artifactUrl, plan.apkPath); }
    catch { throw new Error("APK download failed. No release was created; inspect .local/releases before retrying."); }
  }
  await requireFile(plan.apkPath, "APK file is missing; no release was created.");
  if ((await fs.stat(plan.apkPath)).size === 0) throw new Error("APK is empty; no release was created.");
  try { await fs.writeFile(plan.notesPath, plan.body, { flag: "wx" }); }
  catch { throw new Error("Generated notes already exist or cannot be written. Inspect .local/releases before retrying."); }
  try { await gh(plan.createArgs); }
  catch { throw new Error("GitHub release creation failed. Inspect the tag before retrying; never overwrite or delete a release."); }
  log(`Created ${plan.tag}.`);
  return plan;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

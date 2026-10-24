import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";

import { parseReleaseBody, parseReleaseTag, toLatestRelease } from "../packages/shared/src/app-release.ts";
import { downloadApk, generateNotes, main, parseArgs, prepareRelease } from "./publish-apk-release.mjs";

const execFileAsync = promisify(execFile);
const SCRIPT = fileURLToPath(new URL("./publish-apk-release.mjs", import.meta.url));
const args = ["--apk", "build with spaces.apk", "--notes-file", "notes.txt"];
const missingRelease = () => Object.assign(new Error("not exposed"), { code: 1, stderr: "release not found\n" });
const forbidden = () => { throw new Error("Unexpected external operation"); };

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "uc3-release-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, "apps/mobile"), { recursive: true });
  await fs.writeFile(path.join(root, "apps/mobile/app.json"), JSON.stringify({ expo: {
    version: "2.2.0", runtimeVersion: "2.2.0-sdk57", android: { versionCode: 6, runtimeVersion: "2.2.0-sdk57" },
  } }));
  await fs.writeFile(path.join(root, "build with spaces.apk"), "unit-test bytes");
  await fs.writeFile(path.join(root, "notes.txt"), "Calmer study days.\r\nMore focus.\r\n");
  return { root, cwd: root, gh: forbidden, download: forbidden, log: () => {} };
}

test("parses all supported flags without shell interpretation", () => {
  assert.deepEqual(parseArgs([...args, "--version-name", "2.3.0", "--version-code", "7", "--runtime", "sdk58",
    "--min-supported", "6", "--repo", "owner/releases", "--publish", "--allow-app-json-mismatch"]), {
    apk: "build with spaces.apk", "notes-file": "notes.txt", "version-name": "2.3.0", "version-code": "7",
    runtime: "sdk58", "min-supported": "6", repo: "owner/releases", publish: true, "allow-app-json-mismatch": true,
  });
});

test("rejects unknown, duplicate, missing and positional arguments", () => {
  for (const argv of [[], ["--apk"], [...args, "--wat"], [...args, "--publish", "--publish"],
    [...args, "--runtime", "--publish"], [...args, "--repo", ""], [...args, "hello"], [...args, "--apk", "a.apk"]]) {
    assert.throws(() => parseArgs(argv));
  }
});

test("app.json defaults create exact v2.2.0+6 argv and shared parser fixture", async (t) => {
  const options = await fixture(t);
  const plan = await prepareRelease(parseArgs(args), options);
  assert.deepEqual(parseReleaseTag(plan.tag), { versionName: "2.2.0", versionCode: 6 });
  assert.equal(plan.body, "versionCode: 6\nruntime: 2.2.0-sdk57\n\nCalmer study days.\nMore focus.\n");
  assert.deepEqual(parseReleaseBody(plan.body), {
    versionCode: 6, runtimeVersion: "2.2.0-sdk57", minSupportedVersionCode: null, notes: "Calmer study days.\nMore focus.",
  });
  assert.deepEqual(plan.createArgs, ["release", "create", "v2.2.0+6",
    `${path.join(options.root, "build with spaces.apk")}#stay-focused-2.2.0-6.apk`,
    "--repo", "galaxymaxp/stay-focused-releases", "--title", "Stay Focused 2.2.0", "--notes-file", plan.notesPath]);
  const base = "https://github.com/galaxymaxp/stay-focused-releases/releases";
  assert.equal(toLatestRelease({ tag_name: plan.tag, body: plan.body, html_url: `${base}/tag/${plan.tag}`,
    published_at: "2026-10-19T00:00:00Z", assets: [{ name: "stay-focused-2.2.0-6.apk",
      browser_download_url: `${base}/download/${plan.tag}/stay-focused-2.2.0-6.apk` }] })?.versionCode, 6);
});

test("dry run prints exact argv and notes, invokes no runner/download and changes nothing", async (t) => {
  const options = await fixture(t);
  const before = await fs.readdir(options.root, { recursive: true });
  const output = [];
  const plan = await main(args, { ...options, log: (line) => output.push(line) });
  assert.deepEqual(JSON.parse(output[1]), ["gh", ...plan.createArgs]);
  assert.equal(output[2], `Generated notes:\n${plan.body}`);
  assert.deepEqual(await fs.readdir(options.root, { recursive: true }), before);
  assert.equal(await fs.readFile(path.join(options.root, "notes.txt"), "utf8"), "Calmer study days.\r\nMore focus.\r\n");
});

test("HTTPS dry run computes local asset path without fetching or writing", async (t) => {
  const options = await fixture(t);
  const plan = await main(["--apk", "https://example.invalid/artifact?signature=private", "--notes-file", "notes.txt"], options);
  assert.equal(plan.apkPath, path.join(options.root, ".local/releases/stay-focused-2.2.0-6.apk"));
  assert.ok(!JSON.stringify(plan.createArgs).includes("signature"));
  await assert.rejects(fs.access(plan.outputDir));
});

test("CLI is dry by default, accepts empty named APK and exits nonzero with plain validation errors", async (t) => {
  const options = await fixture(t);
  const apk = path.join(options.root, "build with spaces.apk");
  await fs.writeFile(apk, "");
  const result = await execFileAsync(process.execPath, [SCRIPT, ...args], { cwd: options.cwd });
  assert.match(result.stdout, /Dry run/);
  // The spawned CLI resolves defaults beside SCRIPT, independently of its cwd.
  const { expo } = JSON.parse(await fs.readFile(new URL("../apps/mobile/app.json", import.meta.url), "utf8"));
  assert.equal(JSON.parse(result.stdout.split(/\r?\n/)[1])[3], `v${expo.version}+${expo.android.versionCode}`);
  // Node 22.13 can emit its type-stripping ExperimentalWarning; Node 24 is quiet.
  assert.doesNotMatch(result.stderr, /(?:^|\n)(?:Error:|.*SyntaxError:|.*TypeError:)/);
  await assert.rejects(execFileAsync(process.execPath, [SCRIPT, "--apk", apk]), (error) => {
    assert.equal(error.code, 1);
    assert.equal(error.stderr.trim(), "--notes-file is required.");
    return true;
  });
});

for (const [flag, value] of [["version-name", "2.3.0"], ["version-code", "7"], ["runtime", "native-7"]]) {
  test(`guards ${flag} mismatch unless explicitly allowed`, async (t) => {
    const options = await fixture(t);
    await assert.rejects(prepareRelease(parseArgs([...args, `--${flag}`, value]), options), /differs from app.json/);
    const plan = await prepareRelease(parseArgs([...args, `--${flag}`, value, "--allow-app-json-mismatch"]), options);
    assert.ok(plan.tag);
  });
}

test("identical explicit defaults need no override; optional metadata and custom repo work", async (t) => {
  const options = await fixture(t);
  const plan = await prepareRelease(parseArgs([...args, "--version-name", "2.2.0", "--version-code", "6",
    "--runtime", "2.2.0-sdk57", "--min-supported", "6", "--repo", "owner/releases"]), options);
  assert.equal(parseReleaseBody(plan.body).minSupportedVersionCode, 6);
  assert.ok(plan.createArgs.includes("owner/releases"));
  assert.equal(generateNotes({ versionCode: 6, runtime: "sdk57", minSupported: 5, notes: "Notes" }),
    "versionCode: 6\nruntime: sdk57\nminSupported: 5\n\nNotes\n");
});

for (const [flag, values] of [
  ["version-name", ["2", "2.2", "v2.2.0", "2.2.0+6", "2.2.0\n", "../../bad", "02.2.0"]],
  ["version-code", ["0", "-1", "1.5", "1e2", "NaN", "9007199254740992"]],
  ["runtime", ["", " ", " sdk57", "sdk57\nversionCode: 9", "sdk57\r"]],
  ["min-supported", ["0", "-1", "7", "1.5", "9007199254740992"]],
  ["repo", ["--help", "owner/repo/other", "https://github.com/owner/repo", "owner/.."]],
]) {
  test(`rejects invalid ${flag} values`, async (t) => {
    const options = await fixture(t);
    for (const value of values) await assert.rejects(async () => prepareRelease(parseArgs([
      ...args, `--${flag}`, value, "--allow-app-json-mismatch",
    ]), options));
  });
}

test("rejects missing, empty, binary and reserved metadata notes", async (t) => {
  const options = await fixture(t);
  for (const text of ["", " \r\n", "A\0B", "Notes\nversionCode: 8", "runtime: override", "minSupported: 6"]) {
    await fs.writeFile(path.join(options.root, "notes.txt"), text);
    await assert.rejects(prepareRelease(parseArgs(args), options));
  }
  await fs.unlink(path.join(options.root, "notes.txt"));
  await assert.rejects(prepareRelease(parseArgs(args), options), /readable plain-text/);
});

test("rejects inconsistent runtime defaults even with mismatch override", async (t) => {
  const options = await fixture(t);
  await fs.writeFile(path.join(options.root, "apps/mobile/app.json"), JSON.stringify({ expo: {
    version: "2.2.0", runtimeVersion: "sdk57", android: { versionCode: 6, runtimeVersion: "different" },
  } }));
  await assert.rejects(prepareRelease(parseArgs([...args, "--allow-app-json-mismatch"]), options), /runtimeVersion must match/);
});

test("rejects missing, non-APK, directory, unsafe path and insecure URL inputs", async (t) => {
  const options = await fixture(t);
  await fs.mkdir(path.join(options.root, "directory.apk"));
  for (const apk of ["missing.apk", "notes.txt", "directory.apk", "bad#name.apk", "bad\nname.apk",
    "http://example.invalid/a.apk", "https://user:secret@example.invalid/a.apk", "https://example.invalid/a.apk#x", "ftp://example.invalid/a.apk"]) {
    await assert.rejects(prepareRelease(parseArgs(["--apk", apk, "--notes-file", "notes.txt"]), options));
  }
});

test("existing release is refused before writes or downloads", async (t) => {
  const options = await fixture(t);
  const calls = [];
  await assert.rejects(main([...args, "--publish"], { ...options, gh: async (argv) => { calls.push(argv); } }), /already exists/);
  assert.deepEqual(calls, [["release", "view", "v2.2.0+6", "--repo", "galaxymaxp/stay-focused-releases"]]);
  await assert.rejects(fs.access(path.join(options.root, ".local")));
});

test("uncertain tag checks fail closed with sanitized error", async (t) => {
  const options = await fixture(t);
  for (const error of [new Error("sensitive provider detail"), { code: "ENOENT" }, { code: 1, stderr: "auth failure: secret" },
    { code: 1, stderr: "release not found\nnetwork failure" }, { code: 2, stderr: "release not found" }]) {
    await assert.rejects(main([...args, "--publish"], { ...options, gh: async () => { throw error; } }),
      /^Error: Cannot confirm that the release tag is unused\./);
  }
  await assert.rejects(fs.access(path.join(options.root, ".local")));
});

test("injected publish writes generated notes before exact create argv, never overwrites", async (t) => {
  const options = await fixture(t);
  const calls = [];
  const gh = async (argv) => {
    calls.push(argv);
    if (argv[1] === "view") throw missingRelease();
    assert.equal(await fs.readFile(argv.at(-1), "utf8"), "versionCode: 6\nruntime: 2.2.0-sdk57\n\nCalmer study days.\nMore focus.\n");
  };
  const plan = await main([...args, "--publish"], { ...options, gh });
  assert.deepEqual(calls, [plan.viewArgs, plan.createArgs]);
  await assert.rejects(main([...args, "--publish"], { ...options, gh }), /notes already exist/);
  assert.equal(calls.length, 3);
});

test("empty local APK may dry run but cannot publish", async (t) => {
  const options = await fixture(t);
  await fs.writeFile(path.join(options.root, "build with spaces.apk"), "");
  await main(args, options);
  await assert.rejects(main([...args, "--publish"], { ...options, gh: async () => { throw missingRelease(); } }), /APK is empty/);
});

test("URL publish uses injected download only after missing tag confirmation", async (t) => {
  const options = await fixture(t);
  const events = [];
  const plan = await main(["--apk", "https://example.invalid/eas-artifact", "--notes-file", "notes.txt", "--publish"], {
    ...options,
    gh: async (argv) => { events.push(argv[1]); if (argv[1] === "view") throw missingRelease(); },
    download: async (url, dest) => { events.push("download"); assert.equal(url, "https://example.invalid/eas-artifact"); await fs.writeFile(dest, "APK"); },
  });
  assert.deepEqual(events, ["view", "download", "create"]);
  assert.equal(await fs.readFile(plan.apkPath, "utf8"), "APK");
});

test("download/create failures expose no raw provider details and never retry", async (t) => {
  const options = await fixture(t);
  let createCalls = 0;
  const gh = async (argv) => {
    if (argv[1] === "view") throw missingRelease();
    createCalls += 1;
    throw new Error("private provider detail");
  };
  await assert.rejects(main(["--apk", "https://example.invalid/a", "--notes-file", "notes.txt", "--publish"], {
    ...options, gh, download: async () => { throw new Error("signed URL secret"); },
  }), /^Error: APK download failed\./);
  assert.equal(createCalls, 0);
  await assert.rejects(main([...args, "--publish"], { ...options, gh }), /^Error: GitHub release creation failed\./);
  assert.equal(createCalls, 1);
});

test("stream downloader follows HTTPS redirects and preserves existing artifacts", async (t) => {
  const options = await fixture(t);
  const dest = path.join(options.root, "download.apk");
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push(url);
    assert.equal(init.redirect, "manual");
    assert.ok(init.signal instanceof AbortSignal);
    return calls.length === 1 ? new Response(null, { status: 302, headers: { location: "/final" } }) : new Response("APK bytes");
  };
  await downloadApk("https://example.invalid/start", dest, { fetchImpl });
  assert.deepEqual(calls, ["https://example.invalid/start", "https://example.invalid/final"]);
  assert.equal(await fs.readFile(dest, "utf8"), "APK bytes");
  await assert.rejects(downloadApk("https://example.invalid/start", dest, { fetchImpl }));
  assert.equal(await fs.readFile(dest, "utf8"), "APK bytes");
  await assert.rejects(fs.access(`${dest}.part`));
});

test("stream downloader rejects failed, empty, interrupted, insecure and excessive redirects", async (t) => {
  const options = await fixture(t);
  const dest = path.join(options.root, "download.apk");
  const responses = [
    () => new Response("No", { status: 404 }),
    () => new Response(""),
    () => new Response(new ReadableStream({ start(controller) { controller.error(new Error("interrupted")); } })),
    () => new Response(null, { status: 302, headers: { location: "http://example.invalid/unsafe" } }),
    () => new Response(null, { status: 302 }),
    () => new Response(null, { status: 302, headers: { location: "/loop" } }),
  ];
  for (const response of responses) {
    await assert.rejects(downloadApk("https://example.invalid/start", dest, { fetchImpl: async () => response() }));
    await assert.rejects(fs.access(dest));
    await assert.rejects(fs.access(`${dest}.part`));
  }
});

test("stream downloader preserves an existing partial artifact", async (t) => {
  const options = await fixture(t);
  const dest = path.join(options.root, "download.apk");
  await fs.writeFile(`${dest}.part`, "earlier attempt");
  let cancelled = false;
  const response = new Response(new ReadableStream({ cancel() { cancelled = true; } }));
  await assert.rejects(downloadApk("https://example.invalid/start", dest, { fetchImpl: async () => response }));
  assert.equal(cancelled, true);
  assert.equal(await fs.readFile(`${dest}.part`, "utf8"), "earlier attempt");
});

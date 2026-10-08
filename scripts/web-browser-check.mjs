// Isolated acceptance harness. Fictional data lives only in this test process.
// Never reads .env files, connects to production, or invokes a provider.
import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { createFixture, ids } from "./fixtures/web-api-fixture.mjs";
const domain = createFixture();
const generationFixture = process.argv.includes("--generation-fixture");
const origin = "http://127.0.0.1:3410",
  backend = "http://127.0.0.1:3402",
  output = new URL("../.local/website-qa/", import.meta.url);
await mkdir(output, { recursive: true });
const user = {
  id: "11111111-1111-4111-8111-111111111111",
  aud: "authenticated",
  role: "authenticated",
  email: "student@example.test",
  email_confirmed_at: new Date().toISOString(),
  app_metadata: { provider: "email" },
  user_metadata: { full_name: "Alex Student" },
  created_at: new Date().toISOString(),
};
const jwt = () =>
  [
    Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url"),
    Buffer.from(
      JSON.stringify({
        sub: user.id,
        exp: Math.floor(Date.now() / 1000) + 3600,
        aud: "authenticated",
        role: "authenticated",
      }),
    ).toString("base64url"),
    "fixture-signature",
  ].join(".");
const counts = { auth: 0, api: 0, paid: 0 };
const fixture = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "authorization,apikey,content-type,x-client-info,x-supabase-api-version",
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  );
  res.setHeader("Content-Type", "application/json");
  const send = (value, status = 200) => {
    res.writeHead(status);
    res.end(JSON.stringify(value));
  };
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  const url = new URL(req.url, backend);
  if (url.pathname === "/auth/v1/token") {
    counts.auth++;
    send({
      access_token: jwt(),
      refresh_token: "fictional-refresh-token",
      token_type: "bearer",
      expires_in: 3600,
      user,
    });
    return;
  }
  if (url.pathname === "/auth/v1/user") {
    send(user);
    return;
  }
  if (url.pathname === "/auth/v1/logout") {
    send({});
    return;
  }
  if (!req.headers.authorization?.startsWith("Bearer ")) {
    send({ ok: false, error: { code: "sign_in_required" } }, 401);
    return;
  }
  counts.api++;
  try {
    await domain.handle(req, res, url);
  } catch {
    send({ ok: false, error: { code: "fixture_failure" } }, 500);
  }
});
await new Promise((resolve) => fixture.listen(3402, "127.0.0.1", resolve));
let log = "";
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "apps/web",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3410",
  ],
  {
    cwd: new URL("../", import.meta.url),
    windowsHide: true,
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: backend,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "fictional-public-key",
      STAY_FOCUSED_API_ORIGIN: backend,
      NEXT_PUBLIC_GENERATION_ENABLED: generationFixture ? "true" : "false",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
);
server.stdout.on("data", (chunk) => {
  log += chunk;
});
server.stderr.on("data", (chunk) => {
  log += chunk;
});
let browser;
let activePage;
try {
  let ready = false;
  for (let i = 0; i < 90; i++) {
    try {
      if ((await fetch(`${origin}/sign-in`)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  assert(ready, "Local Next preview did not start");
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    timezoneId: "Asia/Manila",
    reducedMotion: "reduce",
  });
  await context.route("**/*", (route) => {
    const host = new URL(route.request().url()).hostname;
    if (!["127.0.0.1", "localhost"].includes(host)) return route.abort();
    return route.continue();
  });
  const page = await context.newPage(),
    errors = [];
  activePage = page;
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${origin}/today`);
  await page.waitForURL("**/sign-in");
  assert.equal(counts.api, 0, "Protected data requested while signed out");
  await page.screenshot({
    path: new URL("auth-light-mobile.png", output).pathname.replace(
      /^\/(.:)/,
      "$1",
    ),
    fullPage: true,
  });
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill("fictional-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/today");
  await page.getByRole("heading", { name: "Up Next" }).waitFor();
  assert(counts.api > 0, "Shared API rewrite did not forward bearer auth");
  await page.screenshot({
    path: new URL("today-light-mobile.png", output).pathname.replace(
      /^\/(.:)/,
      "$1",
    ),
    fullPage: true,
  });
  await page.reload();
  await page.getByRole("heading", { name: "Up Next" }).waitFor();
  assert.equal(counts.auth, 1, "Session recovery unexpectedly signed in again");
  const capture = async (name) => {
    await page.screenshot({
      path: new URL(`${name}.png`, output).pathname.replace(/^\/(.:)/, "$1"),
      fullPage: true,
    });
  };
  const captureExperience = async (prefix) => {
    for (const theme of ["light", "dark"]) {
      await page.emulateMedia({ colorScheme: theme });
      for (const [name, width, height] of [
        ["mobile", 390, 844],
        ["desktop", 1440, 1000],
      ]) {
        await page.setViewportSize({ width, height });
        await capture(`${prefix}-${theme}-${name}`);
      }
    }
    await page.emulateMedia({ colorScheme: "light" });
    await page.setViewportSize({ width: 390, height: 844 });
  };
  console.log("PASS auth, protected routes, bearer proxy and session recovery");
  await page.route("**/api/today?**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        ok: false,
        error: {
          code: "provider_private_error",
          message: "PRIVATE_DIAGNOSTIC_MUST_NOT_LEAK",
        },
      }),
    }),
  );
  await page.reload();
  await page.getByRole("alert").waitFor();
  assert(
    !(await page.locator("body").innerText()).includes("PRIVATE_DIAGNOSTIC"),
  );
  await page.unroute("**/api/today?**");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await page.getByRole("heading", { name: "Up Next", exact: true }).waitFor();
  await page.goto(`${origin}/tasks`);
  await page.getByRole("button", { name: "Add task", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Read study chapter");
  await page
    .getByLabel("Notes", { exact: true })
    .fill("Read the accepted source.");
  const today = await page.evaluate(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  await page.getByLabel("Due date", { exact: true }).fill(`${today}T23:30`);
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await page.getByRole("link", { name: /Read study chapter/ }).waitFor();
  await capture("tasks-functional-mobile");
  await page.getByRole("link", { name: /Read study chapter/ }).click();
  await page.getByRole("button", { name: "Edit task", exact: true }).click();
  await page.getByLabel("Notes", { exact: true }).fill("Read and reflect.");
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await page.getByText("Read and reflect.", { exact: true }).waitFor();
  await page.goto(`${origin}/schedule`);
  await page
    .getByRole("button", { name: "Preview study plan", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save schedule", exact: true })
    .click();
  await page
    .getByText("Your study schedule is saved.", { exact: true })
    .waitFor();
  await page
    .getByRole("link", { name: "Read study chapter", exact: true })
    .waitFor();
  assert(domain.counts.taskWrites >= 2);
  assert(domain.counts.sessionWrites >= 1);
  console.log(
    "PASS task create/edit/deadline and schedule preview/persistence",
  );
  await page.goto(`${origin}/generate`);
  await page.getByRole("link", { name: /Study foundations/ }).click();
  await page.getByRole("link", { name: /Planning your study/ }).click();
  if (generationFixture) {
    await page
      .getByRole("button", { name: "Generate Reviewer", exact: true })
      .click();
    await page.getByRole("alert").waitFor();
    await page
      .getByRole("button", { name: "Generate Reviewer", exact: true })
      .click();
    await page.waitForURL("**/generation/**");
    await page
      .getByRole("heading", {
        name: "Bringing the important ideas together…",
        exact: true,
      })
      .waitFor();
    await captureExperience("generation-progress");
    domain.finishAdmitted();
    await page
      .getByRole("link", { name: "Open saved output", exact: true })
      .waitFor();
    await page.goto(
      `${origin}/generate/${ids.course}/${encodeURIComponent(ids.material)}`,
    );
    await page
      .getByRole("button", { name: "Generate Quiz", exact: true })
      .click();
    await page
      .getByLabel("Number of questions", { exact: true })
      .selectOption("10");
    await page.getByLabel("Difficulty", { exact: true }).selectOption("medium");
    await page
      .getByRole("button", { name: "Generate Quiz", exact: true })
      .last()
      .click();
    await page.waitForURL("**/generation/**");
    domain.finishAdmitted();
    await page
      .getByRole("link", { name: "Open saved output", exact: true })
      .waitFor();
    console.log(
      "PASS fixture-only Reviewer retry identity and Quiz admission settings",
    );
  } else
    assert(
      await page
        .getByRole("button", { name: "Generate Reviewer", exact: true })
        .isDisabled(),
      "Paid generation was not disabled by default",
    );
  await capture("material-functional-mobile");
  await page.goto(`${origin}/queue`);
  await page.getByRole("link", { name: /Planning Reviewer/ }).click();
  await page
    .getByRole("link", { name: "Open saved output", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Planning study time", exact: true })
    .waitFor();
  const beforeRead = domain.counts.generationCalls;
  await page.reload();
  await page
    .getByRole("heading", { name: "Planning study time", exact: true })
    .waitFor();
  assert.equal(
    domain.counts.generationCalls,
    beforeRead,
    "Reopening a Reviewer submitted generation",
  );
  await page
    .getByLabel("Search topics, terms, definitions", { exact: true })
    .fill("nonexistent topic");
  await page.getByText("No matching topics.", { exact: true }).waitFor();
  await page
    .getByLabel("Search topics, terms, definitions", { exact: true })
    .fill("");
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save to file", exact: true }).click();
  await downloaded;
  await page.goto(`${origin}/library/activity%3A${ids.draft}`);
  await page
    .getByLabel("Reflection", { exact: true })
    .fill("I reviewed the source and planned time.");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page.getByText("Draft saved.", { exact: true }).waitFor();
  await page.reload();
  assert.equal(
    await page.getByLabel("Reflection", { exact: true }).inputValue(),
    "I reviewed the source and planned time.",
  );
  console.log(
    "PASS course/material, generation guard, Queue reopen, Reviewer search/export and saved draft",
  );
  await page.goto(`${origin}/quiz/${ids.quiz}`);
  await page
    .getByRole("button", { name: "Start practice", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Practice question 1", exact: true })
    .waitFor();
  await captureExperience("quiz-question");
  assert(
    await page
      .getByRole("button", { name: "See results", exact: true })
      .isDisabled(),
  );
  assert.equal(
    await page.getByText("Correct answer", { exact: true }).count(),
    0,
    "Answer key visible before check",
  );
  await page
    .getByRole("button", { name: "Plan your study time", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Check answer", exact: true })
    .waitFor({ state: "visible" });
  await page.reload();
  await page
    .getByRole("button", { name: "Resume attempt", exact: true })
    .click();
  assert.equal(
    await page
      .getByRole("button", { name: "Plan your study time", exact: true })
      .getAttribute("aria-pressed"),
    "true",
    "Saved draft did not recover",
  );
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await page.getByRole("heading", { name: "Correct", exact: true }).waitFor();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByLabel("Match Planning", { exact: true }).selectOption("r1");
  await page.getByLabel("Match Reviewing", { exact: true }).selectOption("r2");
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await page.getByRole("heading", { name: "Correct", exact: true }).waitFor();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page
    .getByRole("button", { name: "Plan your study time", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Review your progress", exact: true })
    .click();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await page.getByRole("heading", { name: "Correct", exact: true }).waitFor();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page
    .getByRole("button", { name: "Plan your study time", exact: true })
    .click();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await page.getByRole("heading", { name: "Correct", exact: true }).waitFor();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page
    .getByRole("button", { name: "Review your progress", exact: true })
    .click();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await page.getByRole("heading", { name: "Correct", exact: true }).waitFor();
  await page.getByRole("button", { name: "See results", exact: true }).click();
  await page
    .getByRole("button", { name: "Continue Quiz", exact: true })
    .click();
  await page.getByRole("button", { name: "See results", exact: true }).click();
  await page.getByRole("button", { name: "Finish Quiz", exact: true }).click();
  await page.getByText("100%", { exact: true }).waitFor();
  await capture("quiz-result-mobile");
  await captureExperience("quiz-result");
  await page.reload();
  await page.getByRole("button", { name: "View result", exact: true }).click();
  await page.getByText("100%", { exact: true }).waitFor();
  await page.goto(`${origin}/library`);
  await page.getByText(/Best 100%/).waitFor();
  console.log(
    "PASS choice/multi/true-false/Matching, draft recovery, guarded completion, score/history/Library refresh",
  );
  await page.goto(`${origin}/canvas`);
  await page
    .getByRole("button", { name: "Disconnect Canvas", exact: true })
    .click();
  await page.getByRole("button", { name: "Disconnect", exact: true }).click();
  await page
    .getByLabel("Canvas address", { exact: true })
    .fill("https://canvas.example.test");
  await page
    .getByLabel("Personal access token", { exact: true })
    .fill("fictional-canvas-token");
  await page
    .getByRole("button", { name: "Connect Canvas", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Sync course content", exact: true })
    .click();
  await page.getByText(/Study foundations: succeeded/).waitFor();
  const stored = await page.evaluate(() =>
    JSON.stringify({ ...localStorage, ...sessionStorage }),
  );
  assert(
    !stored.includes("fictional-canvas-token"),
    "Canvas token leaked into browser storage",
  );
  console.log("PASS Canvas connection/disconnection and accepted course sync");
  const screens = [
    ["today", "Up Next"],
    ["schedule", "Plan available time"],
    ["tasks", "Tasks"],
    ["generate", "Generate"],
    ["queue", "Queue"],
    ["library", "Library"],
    [`library/reviewer%3A${ids.reviewer}`, "Planning study time"],
    [`quiz/${ids.quiz}`, "Attempt history"],
    ["canvas", "Canvas"],
    ["settings", "Appearance"],
  ];
  for (const theme of ["light", "dark"]) {
    await page.goto(`${origin}/settings`);
    await page
      .getByRole("button", {
        name: theme[0].toUpperCase() + theme.slice(1),
        exact: true,
      })
      .click();
    for (const [name, width, height] of [
      ["mobile", 390, 844],
      ["desktop", 1440, 1000],
    ]) {
      await page.setViewportSize({ width, height });
      for (const [path, heading] of screens) {
        await page.goto(`${origin}/${path}`);
        await page
          .getByRole("heading", { name: heading, exact: true })
          .waitFor();
        await page.waitForFunction(() => !document.querySelector(".skeleton"));
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
          `${path}/${theme}/${name}: horizontal overflow`,
        );
        await capture(
          `${path.includes("/") ? (path.split("/")[0] === "library" ? "reviewer" : path.split("/")[0]) : path}-${theme}-${name}`,
        );
      }
    }
  }
  await page.goto(`${origin}/today`);
  await page.getByRole("heading", { name: "Up Next", exact: true }).waitFor();
  await page.keyboard.press("Tab");
  assert.equal(
    await page
      .getByRole("link", { name: "Skip to content", exact: true })
      .evaluate((e) => e === document.activeElement),
    true,
  );
  await page.keyboard.press("Enter");
  assert.equal(await page.evaluate(() => document.activeElement?.id), "main");
  await page.getByText("Adjust available time", { exact: true }).click();
  const available = page.getByLabel("Available from", { exact: true });
  const before = Number(await available.inputValue());
  await available.focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(Number(await available.inputValue()), before + 15);
  await page.setViewportSize({ width: 720, height: 1000 });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "200% desktop-equivalent reflow failed",
  );
  console.log(
    "PASS keyboard skip navigation, available-time alternative and 720px reflow",
  );
  await page.goto(`${origin}/settings`);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.waitForURL("**/sign-in");
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (value) => localStorage.setItem("stay-focused-web-theme", value),
      theme,
    );
    for (const [name, width, height] of [
      ["mobile", 390, 844],
      ["desktop", 1440, 1000],
    ]) {
      await page.setViewportSize({ width, height });
      await page.reload();
      await page
        .getByRole("heading", { name: "Welcome back", exact: true })
        .waitFor();
      await capture(`auth-${theme}-${name}`);
    }
  }
  await page.goto(`${origin}/library`);
  await page.waitForURL("**/sign-in");
  assert.equal(
    domain.counts.generationCalls,
    generationFixture ? 3 : 0,
    "Unexpected generation admission",
  );
  console.log(
    "PASS ten major screens in both themes at phone/desktop sizes, and sign-out protection",
  );
  assert.equal(counts.paid, 0);
  assert.deepEqual(errors, []);
  const report = {
    result: "PASS",
    environment: "isolated localhost fictional API/Auth fixtures",
    generationFixture,
    checks: [
      "signed-out protected route",
      "bearer API rewrite",
      "email sign-in",
      "persistent session reload",
      "sanitized service failure and retry recovery",
      "task create/edit and schedule preview/save",
      generationFixture
        ? "fixture-only Reviewer retry identity and Quiz admission settings"
        : "course/material browsing and default generation block",
      "Queue and persisted Reviewer reopen without generation",
      "Reviewer search/export and draft editing/reload",
      "five-question choice/Matching practice with saved drafts",
      "completion guard, confirmation, score/history/reopen",
      "Canvas connect/disconnect, token privacy and accepted sync",
      "ten major screens, two themes, two viewport sizes",
      "keyboard skip link, time adjustment and 720px reflow",
      "sign out and protected route denial",
      "light/dark",
      "390/1440px responsive overflow",
      "zero browser exceptions",
      "zero production/provider requests",
    ],
    counts,
    domainCounts: domain.counts,
  };
  await writeFile(
    new URL(
      generationFixture
        ? "browser-generation-result.json"
        : "browser-result.json",
      output,
    ),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
} catch (error) {
  await writeFile(new URL("preview.log", output), log);
  if (activePage) {
    console.error(
      activePage.url(),
      await activePage.locator("body").innerText(),
    );
    await activePage.screenshot({
      path: new URL("failure.png", output).pathname.replace(/^\/(.:)/, "$1"),
      fullPage: true,
    });
  }
  throw error;
} finally {
  await browser?.close();
  server.kill();
  fixture.close();
}

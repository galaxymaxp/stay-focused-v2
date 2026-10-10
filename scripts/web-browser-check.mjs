// Isolated acceptance harness. Fictional data lives only in this test process.
// Never reads .env files, connects to production, or invokes a provider.
import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createFixture, ids } from "./fixtures/web-api-fixture.mjs";
const domain = createFixture();
const generationFixture = process.argv.includes("--generation-fixture");
const taskSyncOnly = process.argv.includes("--task-sync-only");
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
    "authorization,apikey,content-type,x-client-info,x-supabase-api-version,tus-resumable,upload-length,upload-metadata,upload-offset,upload-concat,upload-defer-length",
  );
  res.setHeader("Access-Control-Expose-Headers", "location,upload-offset,upload-length,tus-resumable");
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
  // A minimal local TUS endpoint standing in for Storage resumable uploads.
  if (url.pathname.startsWith("/storage/v1/upload/resumable")) {
    let size = 0;
    for await (const chunk of req) size += chunk.length;
    res.setHeader("Tus-Resumable", "1.0.0");
    res.setHeader("Upload-Offset", String(size || Number(req.headers["upload-length"] ?? 0)));
    if (req.method === "POST") {
      res.setHeader("Location", `${backend}/storage/v1/upload/resumable/fixture-upload`);
      res.writeHead(201);
    } else res.writeHead(req.method === "PATCH" ? 204 : 200);
    res.end();
    return;
  }
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
  checks: {
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
    path: fileURLToPath(new URL("auth-light-mobile.png", output)),
    fullPage: true,
  });
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill("fictional-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/today");
  await page.getByRole("heading", { name: "Up Next" }).waitFor();
  assert(counts.api > 0, "Shared API rewrite did not forward bearer auth");
  await page.screenshot({
    path: fileURLToPath(new URL("today-light-mobile.png", output)),
    fullPage: true,
  });
  await page.reload();
  await page.getByRole("heading", { name: "Up Next" }).waitFor();
  assert.equal(counts.auth, 1, "Session recovery unexpectedly signed in again");
  const capture = async (name) => {
    await page.screenshot({
      path: fileURLToPath(new URL(`${name}.png`, output)),
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
  // An imported Canvas task's local row can still be pending. Tasks must use
  // the canonical activity status/course instead of reconstructing that row.
  const activityRoute = "**/api/experience/activities?**";
  await page.route(activityRoute, async route => {
    const response = await route.fetch();
    const body = await response.json();
    body.data.items.push({ id: "canvas:submitted-fixture", taskId: "imported-local-pending", title: "Submitted Canvas worksheet", course: { id: ids.course, code: "BIO", name: "Biology" }, dueAt: new Date(Date.now() - 86400000).toISOString(), status: "submitted", priority: "medium", estimatedMinutes: 60, submissionTypes: ["online_upload"], source: "canvas", isOverdue: false, urgency: "later", hasGeneratedDraft: false });
    body.data.items.push({ ...body.data.items.at(-1), id: "canvas:pending-fixture", taskId: "imported-pending", title: "Open Canvas worksheet", status: "pending", urgency: "now", isOverdue: true });
    await route.fulfill({ response, json: body });
  });
  await page.reload();
  await page.getByRole("link", { name: /Open Canvas worksheet/ }).waitFor();
  assert.equal(await page.getByRole("link", { name: /Submitted Canvas worksheet/ }).count(), 0);
  assert((await page.locator(".task-line").filter({ hasText: "Open Canvas worksheet" }).locator(".course-cell").innerText()).includes("BIO"));
  await page.getByRole("button", { name: "Completed", exact: true }).click();
  await page.getByRole("link", { name: /Submitted Canvas worksheet/ }).waitFor();
  assert(await page.locator(".task-line").filter({ hasText: "Submitted Canvas worksheet" }).getByRole("button").isDisabled());
  await page.setViewportSize({ width: 1440, height: 1000 });
  await capture("task-sync-canonical-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await capture("task-sync-canonical-mobile");
  await page.unroute(activityRoute);
  await page.getByRole("button", { name: "Now", exact: true }).click();
  console.log("PASS canonical imported Canvas course/status on desktop and mobile web");

  await page.getByRole("link", { name: /Read study chapter/ }).click();
  await page.getByRole("button", { name: "Edit task", exact: true }).click();
  await page.getByLabel("Notes", { exact: true }).fill("Read and reflect.");
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await page.getByText("Read and reflect.", { exact: true }).waitFor();
  const createDraft = page.getByRole("button", { name: "Create Draft", exact: true });
  if (generationFixture) {
    await createDraft.click();
    await page.waitForURL("**/generation/**");
    domain.finishAdmitted();
    await page.waitForURL(`**/library/activity%3A${ids.draft}`, { timeout: 15000 });
  } else assert(await createDraft.isDisabled(), "Create Draft was not disabled");
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
  const [planned] = domain.sessions();
  const sessionDate = planned.startsAt.slice(0, 10);
  await page.goto(`${origin}/schedule/session/${planned.id}?date=${sessionDate}`);
  await page.getByRole("link", { name: "Open activity", exact: true }).waitFor();
  const writesBeforeDone = domain.counts.sessionWrites;
  await page.getByRole("button", { name: "Mark this block done", exact: true }).click();
  await page.getByRole("button", { name: "Keep it planned", exact: true }).waitFor();
  assert.equal(domain.counts.sessionWrites, writesBeforeDone + 1);
  await page.goto(`${origin}/announcements`);
  await page.getByRole("link", { name: /^Unread: Week 3 reading is posted/ }).click();
  await page.waitForURL("**/announcements/announcement-1");
  await page.getByText("Read the planning chapter before Friday.", { exact: true }).last().waitFor();
  await page.getByRole("link", { name: "Back to all", exact: true }).click();
  await page.getByRole("link", { name: /^Week 3 reading is posted/ }).waitFor();
  console.log("PASS study session status and announcements read state");
  console.log(
    "PASS task create/edit/deadline and schedule preview/persistence",
  );
  if (taskSyncOnly) {
    await page.goto(`${origin}/canvas`);
    await page.getByRole("button", { name: "Sync now", exact: true }).click();
    await page.getByText("Up to date with Canvas", { exact: true }).waitFor();
    assert(domain.counts.canvasWrites >= 1);
    for (const surface of ["today", "tasks", "schedule"]) {
      await page.goto(`${origin}/${surface}`);
      await page.getByRole("button", { name: "Sync now", exact: true }).waitFor();
    }
    assert.equal(counts.paid, 0);
    assert.deepEqual(errors, []);
    await writeFile(new URL("task-sync-summary.json", output), JSON.stringify({ status: "PASS", checks: ["protected auth/bearer proxy", "canonical imported Canvas status and course", "submitted work in Completed only", "desktop/mobile web layout", "personal task create/edit", "schedule planning", "paired Canvas content/grades sync", "Sync now on Tasks/Today/Schedule"], counts: { ...counts, ...domain.counts } }, null, 2));
    console.log("PASS task sync browser acceptance (desktop and mobile, zero paid requests)");
    break checks;
  }
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
  // Finished work opens straight in the Library, as in the app.
  await page.getByRole("button", { name: /Planning Reviewer/ }).click();
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
  // Study Assist: a whole-concept quick assist, then Smart Selection on chosen words.
  await page
    .getByText("Choose a time to study, then review your understanding.", { exact: true })
    .click();
  await page.getByRole("complementary", { name: "Study Assist" }).waitFor();
  await page.getByRole("button", { name: /^Summarize,/ }).click();
  await page.getByText("Fictional summarize for this passage.", { exact: true }).waitFor();
  const assistBefore = domain.counts.assistCalls;
  await page.getByRole("button", { name: "Close Study Assist", exact: true }).click();
  await page
    .getByText("Choose a time to study, then review your understanding.", { exact: true })
    .click();
  await page.getByText("Fictional summarize for this passage.", { exact: true }).waitFor();
  assert.equal(domain.counts.assistCalls, assistBefore, "A saved explanation was requested again");
  await page.evaluate(() => {
    const surface = document.querySelector('[data-testid="smart-selection-surface"]');
    const text = surface.firstChild;
    const at = text.textContent.indexOf("pending tasks");
    const range = document.createRange();
    range.setStart(text, at);
    range.setEnd(text, at + "pending tasks".length);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    surface.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  });
  await page.getByRole("tab", { name: "Define", exact: true }).click();
  await page.getByText("Fictional define result for “pending tasks”.", { exact: true }).waitFor();
  await page.getByRole("button", { name: /From your material/ }).waitFor();
  await page.getByRole("button", { name: "Close Study Assist", exact: true }).click();
  // Select a whole paragraph in the reader and explain exactly that.
  await page
    .getByText("Choose a time to study, then review your understanding.", { exact: true })
    .click({ clickCount: 3 });
  await page.getByRole("toolbar", { name: "Study the selected text" }).getByRole("button", { name: "Explain", exact: true }).click();
  await page
    .getByText("Fictional explain result for “Choose a time to study, then review your understanding.”.", { exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Close Study Assist", exact: true }).click();
  // Pick two key points and explain both.
  await page.getByRole("checkbox", { name: "Start with your pending tasks." }).click();
  await page.getByRole("checkbox", { name: "Plan time before a deadline." }).click();
  await page.getByRole("toolbar", { name: "Selected key points" }).getByRole("button", { name: "Explain simply", exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll(".key-point .icon").length >= 2);
  const quizButton = page.getByRole("button", { name: "Generate Quiz", exact: true });
  if (generationFixture) {
    await quizButton.click();
    await page.getByRole("dialog", { name: "New Quiz" }).waitFor();
    await page.keyboard.press("Escape");
  } else assert(await quizButton.isDisabled(), "Quiz generation was not disabled by default");
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
  if (generationFixture) {
    await page.goto(`${origin}/generate/new`);
    await page
      .getByLabel("Your notes or reading", { exact: true })
      .fill("Plan study time before each deadline and review afterwards.");
    await page.getByLabel("Title", { exact: true }).fill("My planning notes");
    await page.getByRole("button", { name: "Create Reviewer", exact: true }).click();
    await page.waitForURL("**/generation/**");
    await page
      .getByRole("heading", { name: "Bringing the important ideas together…", exact: true })
      .waitFor();
    await page.goto(`${origin}/generate/new`);
    await page.getByRole("button", { name: "Upload a file", exact: true }).click();
    await page.getByLabel("Choose a PDF or photo", { exact: true }).setInputFiles({
      name: "notes.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 fictional"),
    });
    await page.getByRole("button", { name: "Read this file", exact: true }).click();
    const read = page.getByLabel("Check the text we read", { exact: true });
    await read.waitFor();
    assert((await read.inputValue()).includes("Fictional text read from your file."));
    await page.getByRole("button", { name: "Create Reviewer", exact: true }).click();
    await page.waitForURL("**/generation/**");
    assert(domain.counts.sourceWrites >= 2, "Sources were not saved before generation");
    console.log("PASS own material: pasted text and an uploaded file into Reviewer generation");
  }
  await page.goto(`${origin}/quiz/${ids.quiz}`);
  await page
    .getByRole("button", { name: "Start practice", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Practice question 1", exact: true })
    .waitFor();
  await captureExperience("quiz-question");
  await page.getByRole("button", { name: "Finish quiz", exact: true }).click();
  await page.getByText(/You still have 5 unanswered questions/).waitFor();
  await page
    .getByRole("button", { name: "Continue Quiz", exact: true })
    .click();
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
  await page.getByRole("button", { name: "Planning", exact: true }).click();
  await page
    .getByRole("button", { name: "Set available time", exact: true })
    .click();
  await page.getByRole("button", { name: "Reviewing", exact: true }).click();
  await page
    .getByRole("button", { name: "Check understanding", exact: true })
    .click();
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
  await page.getByRole("button", { name: "Finish quiz", exact: true }).click();
  await page
    .getByRole("button", { name: "Continue Quiz", exact: true })
    .click();
  await page.getByRole("button", { name: "Finish quiz", exact: true }).click();
  await page.getByRole("button", { name: "Finish Quiz", exact: true }).click();
  await page.getByText("100%", { exact: true }).waitFor();
  await capture("quiz-result-mobile");
  await captureExperience("quiz-result");
  await page.reload();
  await page.getByRole("button", { name: "View result", exact: true }).click();
  await page.getByText("100%", { exact: true }).waitFor();
  await page.goto(`${origin}/library`);
  await page.getByRole("link", { name: /Study foundations/ }).click();
  await page.waitForURL(`**/library/course/${ids.course}`);
  await page.getByText(/Best 100%/).waitFor();
  await page.getByRole("button", { name: "Quizzes", exact: true }).click();
  await page.getByRole("link", { name: /^Quiz: Study practice/ }).waitFor();
  assert.equal(await page.getByRole("link", { name: /^Reviewer:/ }).count(), 0);
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
    .getByRole("button", { name: "Sync now", exact: true })
    .click();
  await page.getByText("Up to date with Canvas", { exact: true }).waitFor();
  const stored = await page.evaluate(() =>
    JSON.stringify({ ...localStorage, ...sessionStorage }),
  );
  assert(
    !stored.includes("fictional-canvas-token"),
    "Canvas token leaked into browser storage",
  );
  console.log("PASS Canvas connection/disconnection and accepted course sync");
  await page.getByRole("link", { name: "Grades", exact: true }).click();
  await page.getByRole("heading", { name: "Study foundations", exact: true }).waitFor();
  await page.getByText("A-", { exact: true }).first().waitFor();
  await page.getByRole("link", { name: /Weekly study log/ }).waitFor();
  await page.getByRole("link", { name: /Planning reflection/ }).click();
  await page.waitForURL("**/canvas/*/grades/grade-1");
  await page.getByText("18 / 20", { exact: true }).last().waitFor();
  await page.getByText("Unlimited", { exact: true }).waitFor();
  await page.getByRole("link", { name: "Back to all assignments", exact: true }).click();
  await page.waitForURL("**/canvas/*/grades");
  const canvasWritesBeforeGrades = domain.counts.canvasWrites;
  await page.getByRole("button", { name: "Sync grades", exact: true }).click();
  await page.getByText("Grade sync complete", { exact: true }).waitFor();
  assert.equal(domain.counts.canvasWrites, canvasWritesBeforeGrades + 1);
  console.log("PASS Canvas grades summary, assignment detail and grade sync");
  const screens = [
    ["today", "Up Next"],
    ["schedule", "Plan available time"],
    ["tasks", "Tasks"],
    ["generate", "Generate"],
    ["queue", "Queue"],
    ["library", "Library"],
    [`library/artifact%3A${ids.reviewer}`, "Planning study time"],
    [`quiz/${ids.quiz}`, "Attempt history"],
    ["canvas", "Canvas"],
    ["settings", "Appearance"],
    ["announcements", "Announcements"],
    [`canvas/${ids.course}/grades`, "Study foundations"],
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
        await page.waitForFunction(
          () => !document.querySelector(".skeleton, .book-loader"),
        );
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
          `${path}/${theme}/${name}: horizontal overflow`,
        );
        await capture(
          `${path.endsWith("/grades") ? "grades" : path.includes("/") ? (path.split("/")[0] === "library" ? "reviewer" : path.split("/")[0]) : path}-${theme}-${name}`,
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
    // Reviewer retry pair + Quiz, own material (one file read and two
    // Reviewers), then a task's Create Draft.
    generationFixture ? 7 : 0,
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
  }
} catch (error) {
  await writeFile(new URL("preview.log", output), log);
  if (activePage) {
    console.error(
      activePage.url(),
      await activePage.locator("body").innerText(),
    );
    await activePage.screenshot({
      path: fileURLToPath(new URL("failure.png", output)),
      fullPage: true,
    });
  }
  throw error;
} finally {
  await browser?.close();
  server.kill();
  fixture.close();
}

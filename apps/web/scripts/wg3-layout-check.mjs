// Fictional browser acceptance only. Every API/auth request is intercepted;
// the app's fallback origins are loopback and unknown requests fail closed.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const output = new URL('../../../.local/wg3/', import.meta.url);
const origin = 'http://127.0.0.1:3493';
const authOrigin = 'http://127.0.0.1:3494';
const user = { id: '11111111-1111-4111-8111-111111111111', email: 'student@example.test', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} };
const long = 'Foundations of collaborative systems and responsible technology with extended practical applications';
const course = { id: 'course-one', name: long, code: 'TEST101', status: 'available', materialCount: 2, reviewerCount: 1, lastActivityAt: null, period: 'current', courseState: 'current', syncState: 'synced', termName: 'First Semester', lastSuccessfulSyncAt: '2026-10-16T00:00:00Z' };
const courses = [course, { ...course, id: 'course-two', name: 'Study skills' }, { ...course, id: 'course-three', name: `${long} ${long}` }, { ...course, id: 'unsynced', name: 'Independent practice', syncState: 'not_synced', materialCount: null }, { ...course, id: 'past', name: 'Previous study', courseState: 'past' }];
const capability = { status: 'available' };
const material = { id: 'file:example', sourceId: 'file:example', reviewerArtifactId: null, courseId: course.id, title: `Extended material title: ${long}`, kind: 'pdf', readiness: 'ready', count: 2, moduleTitle: `${long} module`, generation: { reviewer: capability, quiz: capability, activityAssistance: capability } };
const workspace = { course, materials: { items: [material], nextOffset: null, totalKnown: 1 }, capabilities: { reviewerGeneration: capability, quizGeneration: capability } };
const inventory = { courses: courses.map(c => ({ id: c.id, displayName: c.name, courseCode: c.code, selected: true, selectable: true, classification: 'likely_current', courseState: c.courseState, lastSync: null })), selectedCourseIds: courses.filter(c => c.courseState === 'current').map(c => c.id) };
let log = '', browser, server;
const report = { checks: [], apiRequests: 0, moveRequests: 0, unexpectedRequests: [], pageErrors: [] };
await mkdir(output, { recursive: true });
try {
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', 'apps/web', '--hostname', '127.0.0.1', '--port', '3493'], {
    cwd: root, windowsHide: true,
    env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: authOrigin, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fictional-public-key', NEXT_SUPABASE_ANON_KEY: 'fictional-public-key', STAY_FOCUSED_API_ORIGIN: authOrigin, NEXT_PUBLIC_GENERATION_ENABLED: 'true', NEXT_TELEMETRY_DISABLED: '1', STAY_FOCUSED_QA_BUILD: '1' },
  });
  server.stdout.on('data', chunk => { log += chunk; });
  server.stderr.on('data', chunk => { log += chunk; });
  let ready = false;
  for (let attempt = 0; attempt < 90; attempt++) {
    try { if ((await fetch(`${origin}/sign-in`, { signal: AbortSignal.timeout(2000) })).ok) { ready = true; break; } } catch { /* local startup */ }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  assert(ready, 'Local Next server did not start');
  browser = await chromium.launch({ headless: true });
  for (const { width, touch } of [{ width: 1440 }, { width: 1024 }, { width: 768 }, { width: 390 }, { width: 1440, touch: true }]) {
    let syncStatus = 'running', courseFailure = false, holdCourses = false, releaseCourses;
    const variant = touch ? 'touch' : 'pointer';
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce', hasTouch: !!touch, serviceWorkers: 'block' });
    await context.addInitScript(({ user }) => {
      const exp = Math.floor(Date.now() / 1000) + 3600;
      const token = `${btoa(JSON.stringify({ alg: 'HS256' }))}.${btoa(JSON.stringify({ sub: user.id, exp, aud: 'authenticated' }))}.fictional`;
      localStorage.setItem('stay-focused-web-auth', JSON.stringify({ access_token: token, refresh_token: 'fictional', expires_at: exp, expires_in: 3600, token_type: 'bearer', user }));
    }, { user });
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      const path = url.pathname;
      const send = (data, rootEnvelope = false, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(rootEnvelope ? { ok: true, ...data } : { ok: true, data }) });
      if (url.origin === authOrigin && path.startsWith('/auth/v1/')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify(user) });
      if (url.origin === origin && path.startsWith('/api/')) {
        report.apiRequests++;
        if (path === '/api/experience/courses') {
          if (holdCourses) await new Promise(resolve => { releaseCourses = resolve; });
          return courseFailure ? send({ error: { code: 'server_error' } }, true, 503) : send({ items: courses, classificationSource: 'canvas' });
        }
        if (path === `/api/experience/courses/${course.id}`) return send(workspace);
        if (path === `/api/experience/courses/${course.id}/batch`) return send({ items: [{ id: material.id, title: material.title, done: false, selectable: true }] });
        if (path.endsWith('/state')) {
          assert.equal(route.request().method(), 'PATCH');
          assert.deepEqual(route.request().postDataJSON(), { override: 'past' });
          report.moveRequests++;
          return send({});
        }
        if (path === '/api/jobs') return send({ jobs: [], nextCursor: null, batches: { requests: [], summaries: [] } });
        if (path === '/api/canvas/connection') return send({ connection: { id: 'fixture', status: 'connected', baseUrl: 'https://canvas.example.test', canvasUserName: 'Alex Student', lastVerifiedAt: '2026-10-16T00:00:00Z' } }, true);
        if (path === '/api/canvas/courses') return send(inventory, true);
        if (path === '/api/canvas/course-preferences') return send({ selectedCourseIds: inventory.selectedCourseIds }, true);
        if (path.endsWith('/sync') || path.startsWith('/api/canvas/sync-jobs/')) return send({
          id: path.startsWith('/api/canvas/sync-jobs/') ? path.split('/').at(-1) : path.replaceAll('/', '-'),
          status: syncStatus,
        });
        report.unexpectedRequests.push(path);
        return route.fulfill({ status: 500, contentType: 'application/json', body: '{"ok":false,"error":{"code":"unexpected_fixture_request"}}' });
      }
      if (url.origin === origin && !path.startsWith('/api/')) return route.continue();
      report.unexpectedRequests.push(url.origin + path);
      return route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', error => report.pageErrors.push(error.message));
    const check = async name => {
      await page.evaluate(() => window.scrollTo(0, 0));
      // Use direct text nodes, clipped to actual overflow bounds, so ancestors
      // are not counted as duplicate text and ellipses are measured as painted.
      const result = await page.evaluate(() => {
        const selectors = '.topbar, .page-heading, .generate-tools, .canvas-refresh, .course-batch-actions, .detail-head, .canvas-course-actions, .course-card, .course-options-popover, .retry-button';
        const boxes = [];
        let nodeId = 0;
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const node = walker.currentNode, parent = node.parentElement;
          if (!node.textContent.trim() || !parent?.closest(selectors) || parent.closest('.sr-only, [aria-hidden="true"]')) continue;
          const range = document.createRange(); range.selectNodeContents(node);
          nodeId++;
          for (const rect of range.getClientRects()) {
            let { left, right, top, bottom } = rect;
            let visible = true;
            for (let element = parent; element; element = element.parentElement) {
              const style = getComputedStyle(element);
              if (style.display === 'none' || style.visibility === 'hidden') { visible = false; break; }
              const bounds = element.getBoundingClientRect();
              if (style.overflowX !== 'visible') { left = Math.max(left, bounds.left); right = Math.min(right, bounds.right); }
              if (style.overflowY !== 'visible') { top = Math.max(top, bounds.top); bottom = Math.min(bottom, bounds.bottom); }
            }
            if (visible && right > left && bottom > top) boxes.push({ nodeId, text: node.textContent.trim(), element: parent.tagName, layer: parent.closest('.course-options-popover') ? 'popover' : 'page', left, right, top, bottom });
          }
        }
        for (const input of document.querySelectorAll('.generate-tools input')) {
          const { left, right, top, bottom } = input.getBoundingClientRect();
          boxes.push({ nodeId: ++nodeId, text: input.getAttribute('aria-label'), left, right, top, bottom });
        }
        const overlaps = [];
        for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i], b = boxes[j];
          // Font ascent/descent rectangles of adjacent lines in the same text
          // node may intersect; they are one text-bearing box, not two controls.
          if (a.nodeId === b.nodeId) continue;
          // Popovers intentionally paint over the page. Compare text within
          // each painted layer; the separate corner geometry check still
          // rejects trigger/title/chevron intersections on the card itself.
          if (a.layer !== b.layer && (a.layer === 'popover' || b.layer === 'popover')) continue;
          if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) overlaps.push([a, b]);
        }
        const heights = [...document.querySelectorAll('.generate-course-tile > .course-card')].map(element => { const r = element.getBoundingClientRect(); return { top: r.top, height: r.height }; });
        const unevenCards = heights.some((a, i) => heights.slice(i + 1).some(b => Math.abs(a.top - b.top) < 1 && Math.abs(a.height - b.height) > 1));
        return { boxes: boxes.length, overlaps, unevenCards, scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth };
      });
      report.checks.push({ name, width, variant, ...result });
      await page.screenshot({ path: fileURLToPath(new URL(`${name}-${width}-${variant}.png`, output)), fullPage: true });
      assert(result.boxes > 0, `${name}: no visible text measured`);
      assert.deepEqual(result.overlaps, [], `${name} at ${width}: overlapping text`);
      assert(!result.unevenCards, `${name} at ${width}: unequal cards`);
      assert(result.scrollWidth <= result.clientWidth + 1, `${name} at ${width}: horizontal page scroll`);
    };
    const singleStatus = async (phase, label) => {
      await page.locator(`.canvas-refresh.${phase}`).waitFor();
      assert.equal(await page.locator('.canvas-refresh').count(), 1, 'More than one sync line');
      assert.equal(await page.locator('.canvas-refresh > span:not(.icon):not(.tile-spinner)').innerText(), label);
      assert.equal(await page.getByText(/Couldn't refresh.*Retry/).count(), 0, 'Duplicate snapshot status');
    };
    await page.goto(`${origin}/generate`);
    await page.getByRole('searchbox', { name: 'Search courses', exact: true }).waitFor();
    await singleStatus('syncing', 'Syncing…');
    const unsynced = page.getByRole('button', { name: /Not synced/ });
    const past = page.getByRole('button', { name: /Past courses/ });
    assert.equal(await unsynced.getAttribute('aria-expanded'), 'false');
    assert.equal(await past.getAttribute('aria-expanded'), 'false');
    const order = await page.locator('.course-group, .own-material-group').evaluateAll(elements => elements.map(element => element.getAttribute('aria-label') || 'Your own material'));
    assert.equal(order.length, 4);
    assert.deepEqual(order.slice(1), ['Your own material', 'Not synced', 'Past courses']);
    assert.notEqual(order[0], 'Your own material');
    await unsynced.click();
    await past.click();
    const sync = page.getByRole('button', { name: 'Sync Independent practice', exact: true });
    assert(!(await sync.getAttribute('class')).includes('primary'));
    assert(await page.locator('.primary').count() <= 1);
    assert.equal(await page.getByText('Course options', { exact: true }).count(), 0);
    const tile = page.locator('.generate-course-tile').first();
    const options = tile.getByRole('button', { name: `Course options for ${long}`, exact: true });
    await page.getByRole('searchbox', { name: 'Search courses', exact: true }).focus();
    await page.getByRole('heading', { name: 'Generate', exact: true }).hover();
    assert.equal(await options.evaluate(element => getComputedStyle(element.parentElement).opacity), width >= 1024 && !touch ? '0' : '1');
    await tile.hover();
    assert.equal(await options.evaluate(element => getComputedStyle(element.parentElement).opacity), '1');
    await tile.locator('a').focus();
    await page.keyboard.press('Tab');
    assert(await options.evaluate(element => element === document.activeElement), 'Menu not reachable from card by Tab');
    assert.equal(await options.evaluate(element => getComputedStyle(element.parentElement).opacity), '1');
    const before = await tile.boundingBox();
    await page.keyboard.press('Enter');
    assert.equal(await options.getAttribute('aria-expanded'), 'true');
    const move = page.getByRole('menuitem', { name: 'Move to past courses', exact: true });
    assert(await move.evaluate(element => element === document.activeElement), 'Opening menu lost focus');
    assert.deepEqual(await tile.boundingBox(), before, 'Menu shifted card');
    await check('generate-menu');
    await page.keyboard.press('Escape');
    assert.equal(await options.getAttribute('aria-expanded'), 'false');
    assert(await options.evaluate(element => element === document.activeElement), 'Escape lost trigger focus');
    await page.keyboard.press('ArrowDown');
    await move.waitFor();
    await page.getByRole('heading', { name: 'Generate', exact: true }).click();
    assert.equal(await options.getAttribute('aria-expanded'), 'false', 'Outside click did not dismiss');
    await options.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    assert.equal(await options.getAttribute('aria-expanded'), 'false', 'Tab leaving menu did not dismiss');
    await options.focus();
    await page.keyboard.press('Enter');
    await move.click();
    assert.equal(await options.getAttribute('aria-expanded'), 'false');
    assert(await options.evaluate(element => element === document.activeElement), 'Move lost trigger focus');
    const geometry = await page.locator('.generate-course-tile').evaluateAll(tiles => tiles.map(tile => {
      const trigger = tile.querySelector('.course-options > button').getBoundingClientRect();
      const card = tile.querySelector('.course-card').getBoundingClientRect();
      const others = [...tile.querySelectorAll('.course-card > .grow, .course-card > .icon, .course-card > button')];
      return {
        contained: trigger.left >= card.left && trigger.right <= card.right && trigger.top >= card.top && trigger.bottom <= card.bottom,
        overlaps: others.some(element => {
          const rect = element.getBoundingClientRect();
          return Math.min(trigger.right, rect.right) - Math.max(trigger.left, rect.left) > 1 && Math.min(trigger.bottom, rect.bottom) - Math.max(trigger.top, rect.top) > 1;
        }),
      };
    }));
    assert(geometry.every(result => result.contained && !result.overlaps), 'Corner menu overlaps or escapes card');
    await check('generate-syncing');
    const search = page.getByRole('searchbox', { name: 'Search courses', exact: true });
    await search.fill('no matching fictional course');
    await page.getByText('No matching courses.', { exact: true }).waitFor();
    assert(await page.getByRole('link', { name: /Your own material/ }).isVisible());
    assert.equal(await page.locator('.generate-course-tile').count(), 0);
    await search.fill('');

    // Finish the fictional Canvas run as failed, then hold a course-list refresh
    // to reproduce a stale Canvas failure coexisting with refreshing=true.
    syncStatus = 'failed';
    await singleStatus('failed', 'Canvas sync didn’t finish');
    await check('generate-failed');
    holdCourses = true;
    await page.evaluate(() => window.dispatchEvent(new Event('sf:task-state-changed')));
    await singleStatus('syncing', 'Syncing…');
    assert.equal(await page.getByText('Canvas sync didn’t finish', { exact: true }).count(), 0);
    await check('generate-refresh-over-failure');
    holdCourses = false;
    releaseCourses();
    await singleStatus('failed', 'Canvas sync didn’t finish');
    syncStatus = 'succeeded';
    await page.getByRole('button', { name: 'Sync now', exact: true }).click();
    await page.locator('.canvas-refresh.updated').waitFor();
    assert.match(await page.locator('.canvas-refresh').innerText(), /Updated just now/);
    assert.equal(await page.locator('.canvas-refresh').count(), 1);
    await check('generate-updated');

    // Exercise State's actual error action with no saved snapshot. Keep its
    // behaviour and measure padding under desktop and narrow CSS rules.
    courseFailure = true;
    await page.evaluate(async () => {
      await new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase('stay-focused-screen-snapshots');
        request.onsuccess = resolve; request.onerror = reject;
      });
    });
    await page.goto(`${origin}/generate?fixture=error`);
    const retry = page.getByRole('button', { name: 'Try again', exact: true });
    await retry.waitFor();
    const padding = await retry.evaluate(element => ({ padding: getComputedStyle(element).padding, height: element.getBoundingClientRect().height }));
    assert.equal(padding.padding, '12px 16px');
    assert(padding.height >= 48);
    await check('generate-error-padding');
    courseFailure = false;
    await retry.click();
    await page.locator('.generate-course-tile').first().waitFor();
    courseFailure = false;
    await page.goto(`${origin}/canvas`);
    const canvasOptions = page.getByRole('button', { name: 'Course options', exact: true }).last();
    await canvasOptions.waitFor();
    await canvasOptions.click();
    const canvasMove = page.getByRole('menuitem', { name: 'Move to past courses', exact: true });
    await canvasMove.scrollIntoViewIfNeeded();
    assert(await canvasMove.evaluate(element => {
      const rect = element.getBoundingClientRect();
      return element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
    }), 'Canvas menu action is clipped');
    await page.keyboard.press('Escape');
    assert(await canvasOptions.evaluate(element => element === document.activeElement));
    await check('canvas');
    await context.close();
  }
  assert.deepEqual(report.unexpectedRequests, [], 'Unexpected network requests');
  assert.deepEqual(report.pageErrors, [], 'Browser runtime errors');
  assert.equal(report.moveRequests, 5, 'Existing move action did not run at every viewport/input mode');
  console.log(`PASS ${report.checks.length} page/viewport checks; four widths plus wide touch, keyboard menu, geometry, sync priority, secondary Sync, Canvas compatibility; all API/auth mocked`);
} finally {
  await writeFile(new URL('report.json', output), JSON.stringify(report, null, 2));
  await writeFile(new URL('server.log', output), log);
  await browser?.close();
  if (server && server.exitCode === null) {
    if (process.platform === 'win32') {
      const killer = spawn('taskkill', ['/pid', String(server.pid), '/t', '/f'], { windowsHide: true });
      await new Promise(resolve => killer.once('exit', resolve));
    } else server.kill();
  }
}

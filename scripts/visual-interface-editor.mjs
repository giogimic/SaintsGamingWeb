#!/usr/bin/env node
/**
 * Visual functionality test — Viewfinder Interface Editor UX
 *
 * Flow:
 *   register → NextAuth credentials → /lobby → Enter World → Connect → New Hero
 *   → create character → EXPLORING → OPTIONS → Interface → Edit Interface
 *   → assert menu closed + Viewfinder toolbar → Save & Exit
 *
 * Usage:
 *   node scripts/visual-interface-editor.mjs
 *   BASE_URL=http://127.0.0.1:3000 node scripts/visual-interface-editor.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
const OUT = process.env.ARTIFACT_DIR || '/opt/cursor/artifacts/interface-editor-visual';
const CHROME = process.env.CHROME_PATH || '/usr/local/bin/google-chrome';
const PASSWORD = 'TestPass123!';

mkdirSync(OUT, { recursive: true });

const stamp = Date.now();
const email = `iface_${stamp}@saints.test`;
const username = `ifc_${String(stamp).slice(-8)}`;
const charName = `Hud${String(stamp).slice(-5)}`;

const findings = [];
const report = { base: BASE, email, username, charName, at: new Date().toISOString(), findings };

function log(...args) {
  console.log(...args);
}

async function shot(page, name, step) {
  const path = join(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  findings.push({ step, screenshot: path, ok: true });
  log(`[shot] ${step} → ${path}`);
  return path;
}

function fail(step, detail) {
  findings.push({ step, ok: false, detail });
  log(`[FAIL] ${step}: ${detail}`);
}

async function register() {
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, username, password: PASSWORD, displayName: username }),
  });
  const body = await res.text();
  if (res.status !== 201) {
    throw new Error(`register ${res.status}: ${body.slice(0, 200)}`);
  }
  log(`[auth] registered ${email} (${res.status})`);
}

async function signIn(context) {
  const csrfRes = await context.request.get(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const loginRes = await context.request.post(`${BASE}/api/auth/callback/credentials`, {
    form: {
      csrfToken,
      identifier: email,
      password: PASSWORD,
      callbackUrl: `${BASE}/lobby`,
      json: 'true',
    },
  });
  if (!loginRes.ok()) {
    throw new Error(`credentials login ${loginRes.status()}: ${await loginRes.text()}`);
  }
  log(`[auth] session cookie set (${loginRes.status()})`);
}

async function clickText(page, text, opts = {}) {
  const loc = page.getByText(text, { exact: opts.exact ?? false }).first();
  await loc.waitFor({ state: 'visible', timeout: opts.timeout ?? 30000 });
  await loc.click({ timeout: opts.timeout ?? 15000 });
}

async function clickButton(page, name, opts = {}) {
  const loc = page.getByRole('button', { name, exact: opts.exact ?? false }).first();
  await loc.waitFor({ state: 'visible', timeout: opts.timeout ?? 30000 });
  await loc.click({ timeout: opts.timeout ?? 15000 });
}

async function main() {
  await register();

  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--use-gl=angle', '--use-angle=swiftshader'],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  await signIn(context);

  const page = await context.newPage();
  page.setDefaultTimeout(45000);

  try {
    // ── Title ──────────────────────────────────────────────────────────
    await page.goto(`${BASE}/lobby`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForTimeout(2500);
    await shot(page, '01-title', 'lobby-title');

    // Title-screen Options path (partial — menu open before entering world)
    const titleOptions = page.getByRole('button', { name: /Options/i }).first();
    if (await titleOptions.isVisible().catch(() => false)) {
      await titleOptions.click();
      await page.waitForTimeout(400);
      await shot(page, '02-title-options', 'title-options-open');
      await clickButton(page, 'Interface');
      await page.waitForTimeout(300);
      await shot(page, '03-title-interface-tab', 'title-interface-tab');
      // Close without entering edit yet — full edit verified in-world
      await page.keyboard.press('Escape').catch(() => {});
      const closeX = page.locator('button').filter({ has: page.locator('svg') }).first();
      // Click the Settings modal close if still open
      const settingsHeading = page.getByText('Settings', { exact: true });
      if (await settingsHeading.isVisible().catch(() => false)) {
        await page.locator('button').filter({ has: page.locator('.lucide-x, svg') }).first().click().catch(() => {});
        // Fallback: click Leave Game area's sibling close — use the X near top-right of modal
        await page.evaluate(() => {
          const buttons = [...document.querySelectorAll('button')];
          const xBtn = buttons.find((b) => b.querySelector('svg') && b.className.includes('absolute'));
          xBtn?.click();
        });
      }
      await page.waitForTimeout(300);
    }

    // ── Enter world ────────────────────────────────────────────────────
    await clickButton(page, /Enter World|Play Now/);
    await page.waitForTimeout(1500);
    await shot(page, '04-world-select', 'world-select');

    const startRealm = page.getByRole('button', { name: /Start Realm/i });
    if (await startRealm.isVisible().catch(() => false)) {
      await startRealm.click();
      await page.waitForTimeout(2000);
    }
    await clickButton(page, /^Connect$/);
    await page.waitForTimeout(2000);
    await shot(page, '05-character-select', 'character-select');

    // New hero or Play existing
    const newHero = page.getByText('New Hero', { exact: true }).first();
    const playBtn = page.getByRole('button', { name: /^Play$/ }).first();
    if (await newHero.isVisible().catch(() => false)) {
      await newHero.click();
      await page.waitForTimeout(1000);
      await shot(page, '06-hero-pick', 'hero-pick');

      // Pick first hero card (fallback names or DB)
      const heroCard = page.locator('button, div[role="button"], div').filter({ hasText: /Warrior|Paladin|Mystic|Ranger|Shadow|Monk/ }).first();
      // Click a hero tile — cards are often clickable divs with the hero name
      await page.evaluate(() => {
        const names = ['Warrior', 'Paladin', 'Mystic', 'Ranger', 'Shadow', 'Monk'];
        for (const n of names) {
          const el = [...document.querySelectorAll('*')].find(
            (e) => e.childElementCount < 12 && e.textContent?.trim().startsWith(n) && e.offsetParent
          );
          if (el) {
            (el.closest('button') || el).click();
            return;
          }
        }
      });
      await page.waitForTimeout(800);

      // Name
      const nameInput = page.locator('input').first();
      await nameInput.waitFor({ state: 'visible', timeout: 20000 });
      await nameInput.fill(charName);
      await shot(page, '07-name', 'name-step');
      await clickButton(page, 'Appearance');
      await page.waitForTimeout(600);
      await shot(page, '08-appearance', 'appearance');
      await clickButton(page, 'Choose Gift');
      await page.waitForTimeout(600);
      await shot(page, '09-gift', 'gift');
      await clickButton(page, 'Review');
      await page.waitForTimeout(600);
      await shot(page, '10-review', 'review');
      await clickButton(page, 'Start Adventure');
    } else if (await playBtn.isVisible().catch(() => false)) {
      await playBtn.click();
    } else {
      throw new Error('No New Hero or Play button on character select');
    }

    // Wait for EXPLORING HUD
    const optionsBtn = page.getByRole('button', { name: /OPTIONS \(ESC\)/i });
    await optionsBtn.waitFor({ state: 'visible', timeout: 90000 });
    await page.waitForTimeout(2000);
    await shot(page, '11-in-world', 'in-world');

    // ── Interface Editor ───────────────────────────────────────────────
    await optionsBtn.click();
    await page.waitForTimeout(500);
    const settingsVisible = await page.getByText('Settings', { exact: true }).isVisible();
    if (!settingsVisible) fail('options-open', 'Settings modal not visible');
    await shot(page, '12-options-open', 'options-open');

    await clickButton(page, 'Interface');
    await page.waitForTimeout(400);
    await shot(page, '13-interface-tab', 'interface-tab');

    await clickButton(page, 'Edit Interface');
    await page.waitForTimeout(800);

    // Assert Options closed
    const settingsStillOpen = await page.getByText('Settings', { exact: true }).isVisible().catch(() => false);
    if (settingsStillOpen) {
      fail('menu-auto-close', 'Settings still open after Edit Interface');
    } else {
      findings.push({ step: 'menu-auto-close', ok: true });
      log('[ok] menu-auto-close');
    }

    // Viewfinder toolbar
    const viewfinderLabel = page.getByText('Viewfinder', { exact: true });
    const saveExit = page.getByRole('button', { name: /Save & Exit/i });
    const resetBtn = page.getByRole('button', { name: /^Reset$/i });
    const toolbarOk =
      (await saveExit.isVisible().catch(() => false)) &&
      (await resetBtn.isVisible().catch(() => false));
    if (!toolbarOk) {
      fail('viewfinder-toolbar', 'Reset / Save & Exit not visible');
    } else {
      findings.push({
        step: 'viewfinder-toolbar',
        ok: true,
        hasViewfinderLabel: await viewfinderLabel.isVisible().catch(() => false),
      });
      log('[ok] viewfinder-toolbar');
    }

    // Green dashed outlines on editable panels (border style probe)
    const outlineProbe = await page.evaluate(() => {
      const nodes = [...document.querySelectorAll('*')];
      let dashedGreen = 0;
      for (const el of nodes) {
        const s = getComputedStyle(el);
        if (s.borderStyle.includes('dashed') && (s.borderColor.includes('16, 185, 129') || s.borderColor.includes('10, 185, 129') || s.outlineStyle === 'dashed')) {
          dashedGreen += 1;
        }
        // also check inline style / outline
        if (el.style?.outline?.includes('dashed') && el.style.outline.includes('10B981')) dashedGreen += 1;
        if (el.style?.border?.includes('dashed') && (el.style.border.includes('10B981') || el.style.border.includes('16, 185, 129'))) dashedGreen += 1;
      }
      return { dashedGreen, cursorGrab: nodes.some((el) => getComputedStyle(el).cursor === 'grab') };
    });
    findings.push({ step: 'hud-edit-chrome', ok: outlineProbe.dashedGreen > 0 || outlineProbe.cursorGrab, ...outlineProbe });
    log('[probe] hud-edit-chrome', outlineProbe);

    await shot(page, '14-viewfinder-edit', 'viewfinder-edit');

    // Drag classic panel a bit if grab target exists
    const grabTarget = page.locator('[style*="grab"], [class*="cursor-grab"]').first();
    if (await grabTarget.isVisible().catch(() => false)) {
      const box = await grabTarget.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + 10);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + 48, box.y + 10 + 32, { steps: 8 });
        await page.mouse.up();
        await page.waitForTimeout(400);
        await shot(page, '15-after-drag', 'after-drag');
        findings.push({ step: 'drag-panel', ok: true });
      }
    } else {
      findings.push({ step: 'drag-panel', ok: false, detail: 'no grab target found (non-blocking)' });
    }

    // Save & Exit
    await saveExit.click();
    await page.waitForTimeout(1500);
    const toolbarGone = !(await saveExit.isVisible().catch(() => false));
    if (!toolbarGone) fail('save-exit', 'toolbar still visible');
    else {
      findings.push({ step: 'save-exit', ok: true });
      log('[ok] save-exit');
    }
    await shot(page, '16-after-save-exit', 'after-save-exit');

    // Re-enter briefly + Reset path
    await optionsBtn.click();
    await page.waitForTimeout(400);
    await clickButton(page, 'Interface');
    await clickButton(page, 'Edit Interface');
    await page.waitForTimeout(600);
    page.once('dialog', (d) => d.accept());
    await resetBtn.click();
    await page.waitForTimeout(600);
    await shot(page, '17-after-reset', 'after-reset');
    findings.push({ step: 'reset', ok: true });
    log('[ok] reset');

    await page.getByRole('button', { name: /Save & Exit/i }).click();
    await page.waitForTimeout(1000);
    await shot(page, '18-final', 'final');
  } catch (err) {
    fail('uncaught', String(err?.stack || err));
    try {
      await shot(page, '99-error', 'error');
    } catch {
      /* ignore */
    }
    throw err;
  } finally {
    const passed = findings.filter((f) => f.ok === true).length;
    const failed = findings.filter((f) => f.ok === false).length;
    report.summary = { passed, failed, total: findings.length };
    const reportPath = join(OUT, 'report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log(`[done] report → ${reportPath} (passed=${passed} failed=${failed})`);
    await browser.close();
  }

  if (report.summary.failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

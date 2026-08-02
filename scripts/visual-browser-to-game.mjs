/**
 * Visual check: home → /lobby → login → Spyder Tamer → Azure Town.
 * Writes screenshots + a JSON report under /opt/cursor/artifacts/visual-check/
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT = process.env.OUT_DIR || '/opt/cursor/artifacts/visual-check';
const stamp = Date.now();
const email = `visual_${stamp}@saints.test`;
const username = `vis_${String(stamp).slice(-8)}`;
const password = 'password1';
const charName = `Spy${String(stamp).slice(-5)}`;

fs.mkdirSync(OUT, { recursive: true });

const findings = [];
const shot = async (page, name) => {
  const file = path.join(OUT, `${String(findings.length + 1).padStart(2, '0')}-${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  findings.push({ step: name, screenshot: file, ok: true });
  console.log(`[shot] ${name} → ${file}`);
  return file;
};

const fail = (step, err) => {
  findings.push({ step, ok: false, error: String(err?.message || err) });
  console.error(`[fail] ${step}:`, err?.message || err);
};

async function main() {
  // Register via API
  const reg = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, username, password }),
  });
  const regBody = await reg.json().catch(() => ({}));
  if (!reg.ok && reg.status !== 409) {
    throw new Error(`register failed ${reg.status}: ${JSON.stringify(regBody)}`);
  }
  console.log(`[auth] registered ${email} (${reg.status})`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader'],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(45000);

  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(String(e.message || e)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  try {
    // 1) Home
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForTimeout(1500);
    await shot(page, 'home');

    // 2) Lobby title
    await page.goto(`${BASE}/lobby`, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.getByRole('button', { name: /Play Now|Enter World/i }).waitFor({ timeout: 60000 });
    // Dismiss cookie banner if present (blocks clicks)
    const acceptCookies = page.getByRole('button', { name: /Accept All/i });
    if (await acceptCookies.isVisible().catch(() => false)) {
      await acceptCookies.click().catch(() => {});
      await page.waitForTimeout(300);
    }
    await page.waitForTimeout(1200);
    await shot(page, 'lobby-title');

    // 3) Login
    await page.getByRole('button', { name: /Play Now|Enter World/i }).click();
    await page.getByPlaceholder(/Enter your email/i).waitFor();
    await shot(page, 'login');
    await page.getByPlaceholder(/Enter your email/i).fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.getByRole('button', { name: /Enter World/i }).click();

    // 4) World select
    await page.getByText(/World Select|Select Realm|Invalid credentials/i).first().waitFor({ timeout: 30000 });
    if (await page.getByText(/Invalid credentials/i).isVisible().catch(() => false)) {
      throw new Error('Login rejected: Invalid credentials (check identifier mapping)');
    }
    await page.getByText(/World Select|Select Realm/i).first().waitFor({ timeout: 30000 });
    await page.waitForTimeout(1500);
    // Ensure realm online
    const startRealm = page.getByRole('button', { name: /Start Realm/i });
    if (await startRealm.isVisible().catch(() => false)) {
      await startRealm.click();
      await page.waitForTimeout(2000);
    }
    await shot(page, 'world-select');
    await page.getByRole('button', { name: /^Connect$/i }).click();

    // 5) Character select → create
    await page.getByText(/New Hero|Create a character|Choose Your Hero/i).first().waitFor({ timeout: 30000 });
    await page.waitForTimeout(800);
    await shot(page, 'character-select');

    const newHero = page.getByText(/New Hero/i);
    if (await newHero.isVisible().catch(() => false)) {
      await newHero.click();
    }

    await page.getByText(/Choose Your Hero/i).waitFor({ timeout: 30000 });
    // Wait out "Loading heroes..." (server actions can be slow on cold compile)
    await page
      .getByText(/Loading heroes/i)
      .waitFor({ state: 'hidden', timeout: 90000 })
      .catch(() => {});
    await page.waitForTimeout(500);
    await shot(page, 'hero-pick');

    // Prefer Spyder Tamer card (may need scroll in long DB hero lists)
    let spyder = page.getByText('Spyder Tamer', { exact: false });
    for (let i = 0; i < 8 && !(await spyder.count()); i++) {
      await page.mouse.wheel(0, 600);
      await page.waitForTimeout(200);
      spyder = page.getByText('Spyder Tamer', { exact: false });
    }
    if (!(await spyder.count())) {
      throw new Error('Spyder Tamer hero not listed');
    }
    await spyder.first().scrollIntoViewIfNeeded();
    await spyder.first().click();

    // Name step
    await page.getByPlaceholder(/name|tamer|hero/i).first().waitFor({ timeout: 15000 }).catch(() => {});
    const nameInput = page.locator('input').filter({ hasNot: page.locator('[type=hidden]') }).first();
    // Find visible text input on NAME step
    const inputs = page.locator('input[type="text"], input:not([type])');
    await inputs.first().waitFor({ timeout: 15000 });
    await inputs.first().fill(charName);
    await shot(page, 'name-step');
    await page.getByRole('button', { name: /Appearance/i }).click();

    // Appearance → Gift → Review
    await page.getByRole('button', { name: /Choose Gift|Next/i }).first().waitFor({ timeout: 15000 });
    await shot(page, 'appearance');
    // Click "Choose Gift" NextButton or "Next →"
    const giftBtn = page.getByRole('button', { name: /Choose Gift/i });
    if (await giftBtn.isVisible().catch(() => false)) {
      await giftBtn.click();
    } else {
      await page.getByRole('button', { name: /Next/i }).first().click();
    }

    await page.getByText(/Starting Gift|innate perk/i).first().waitFor({ timeout: 15000 });
    await shot(page, 'gift');
    await page.getByRole('button', { name: /Review/i }).click();

    await page.getByRole('button', { name: /Start Adventure/i }).waitFor({ timeout: 15000 });
    await shot(page, 'review');
    await page.getByRole('button', { name: /Start Adventure/i }).click();

    // 6) In world — wait for canvas / exploring UI
    await page.waitForTimeout(2500);
    // Canvas from Babylon
    const canvas = page.locator('canvas').first();
    await canvas.waitFor({ state: 'visible', timeout: 60000 });
    await page.waitForTimeout(4000);
    await shot(page, 'in-world');

    // Probe map id from client store / HUD if exposed
    const mapProbe = await page.evaluate(() => {
      const bodyText = document.body?.innerText || '';
      const hasSpyderTrail = /Spyder Trail/i.test(bodyText);
      const hasAzure = /Azure/i.test(bodyText);
      const canvasCount = document.querySelectorAll('canvas').length;
      const webgl = (() => {
        try {
          const c = document.querySelector('canvas');
          if (!c) return false;
          const gl = c.getContext('webgl2') || c.getContext('webgl');
          return !!gl;
        } catch {
          return false;
        }
      })();
      return { hasSpyderTrail, hasAzure, canvasCount, bodySnippet: bodyText.slice(0, 500), webgl };
    });
    findings.push({ step: 'map-probe', ok: true, ...mapProbe });
    console.log('[probe]', mapProbe);

    // Try interact near spawn (E / click interact) for Guide dialogue
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(1200);
    await shot(page, 'interact-attempt');

    // Walk east a bit toward route gate
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(180);
    }
    await page.waitForTimeout(800);
    await shot(page, 'walk-east');

    const serious = consoleErrors.filter(
      (e) =>
        !/status of 401/.test(e) &&
        !/status of 404 \(Not Found\)$/.test(e) &&
        !/Failed to load resource/.test(e)
    );
    findings.push({
      step: 'console-errors',
      ok: serious.length === 0,
      errors: consoleErrors.slice(0, 40),
      serious: serious.slice(0, 20),
    });

    // Hard gate: must reach Azure Town with Spyder Trail
    if (!mapProbe.hasSpyderTrail || !mapProbe.hasAzure) {
      fail('spyder-spawn', 'Expected AZURE_TOWN + Spyder Trail after Spyder Tamer create');
    }
  } catch (err) {
    fail('flow', err);
    try {
      await shot(page, 'error-state');
    } catch {
      /* ignore */
    }
  } finally {
    const report = {
      base: BASE,
      email,
      username,
      charName,
      at: new Date().toISOString(),
      findings,
      consoleErrors: consoleErrors.slice(0, 50),
    };
    const reportPath = path.join(OUT, 'report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`[done] report → ${reportPath}`);
    await browser.close();
    const hardFail = findings.some((f) => f.ok === false);
    process.exit(hardFail ? 1 : 0);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

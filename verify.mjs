import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const chromeCandidates = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);
const executablePath = chromeCandidates.find((candidate) => existsSync(candidate));
if (!executablePath) {
  console.error('未找到 Chrome，请安装 Chrome 或设置 CHROME_PATH 环境变量。');
  process.exit(1);
}
const targetUrl = process.env.VERIFY_URL || 'http://127.0.0.1:5173';

await mkdir('test-results', { recursive: true });
const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (error) => errors.push(`PAGE: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') errors.push(`CONSOLE: ${message.text()}`); });
await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2200);
await page.screenshot({ path: 'test-results/new-car-intro.png' });
const canopyInfo = await page.evaluate(() => {
  const canopy = window.__NEON_DEBUG__?.car.visual.getObjectByName('glass-canopy');
  if (!canopy) return null;
  return {
    visible: canopy.visible,
    vertices: canopy.geometry.attributes.position.count,
    transparent: canopy.material.transparent,
    opacity: canopy.material.opacity,
    side: canopy.material.side,
    depthWrite: canopy.material.depthWrite,
    position: canopy.position.toArray(),
  };
});
await page.click('#start-btn');
await page.waitForFunction(() => window.__NEON_DEBUG__?.state.mode === 'racing', null, { timeout: 30000 });
await page.keyboard.down('KeyW');
await page.waitForFunction(() => window.__NEON_DEBUG__?.state.velocity.length() * 3.6 > 30, null, { timeout: 30000 });
const speedBeforeBoost = await page.locator('#speed').textContent();
const nitroBeforeBoost = await page.locator('#nitro-fill').evaluate((el) => el.style.width);
await page.keyboard.down('ShiftLeft');
await page.waitForTimeout(1300);
const speedDuringBoost = await page.locator('#speed').textContent();
const nitroDuringBoost = await page.locator('#nitro-fill').evaluate((el) => el.style.width);
const boostClass = await page.locator('#drift-meter').getAttribute('class');
const racingState = await page.evaluate(() => {
  const current = window.__NEON_DEBUG__?.state;
  return current ? {
    mode: current.mode,
    speed: current.velocity.length(),
    lap: current.lap,
    progress: current.progress,
    nearestIndex: current.nearestIndex,
  } : null;
});
await page.screenshot({ path: 'test-results/new-car-boost.png' });
await page.keyboard.up('ShiftLeft');
await page.keyboard.up('KeyW');
await page.keyboard.press('KeyC');
await page.waitForTimeout(700);
await page.screenshot({ path: 'test-results/new-car-hood.png' });
await page.close();
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
mobile.on('pageerror', (error) => errors.push(`MOBILE: ${error.message}`));
await mobile.goto(targetUrl, { waitUntil: 'networkidle', timeout: 60000 });
await mobile.tap('#start-btn');
await mobile.waitForFunction(() => window.__NEON_DEBUG__?.state.mode === 'racing', null, { timeout: 30000 });
await mobile.waitForTimeout(900);
const touchBoostVisible = await mobile.locator('.touch-boost').isVisible();
const boostBox = await mobile.locator('.touch-boost').boundingBox();
const speedBox = await mobile.locator('.speedometer').boundingBox();
await mobile.screenshot({ path: 'test-results/new-car-mobile.png' });
console.log(JSON.stringify({ canopyInfo, racingState, speedBeforeBoost, speedDuringBoost, nitroBeforeBoost, nitroDuringBoost, boostClass, touchBoostVisible, boostBox, speedBox, errors }, null, 2));
await browser.close();
if (errors.length > 0) process.exitCode = 1;

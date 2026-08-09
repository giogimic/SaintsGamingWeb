const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Set viewport to a typical desktop size
  await page.setViewport({ width: 1280, height: 800 });

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  console.log("Navigating to http://localhost:3000/studio");
  await page.goto('http://localhost:3000/studio', { waitUntil: 'networkidle0', timeout: 30000 });

  console.log("Waiting a few seconds for map to load...");
  await new Promise(r => setTimeout(r, 5000));

  console.log("Capturing screenshot...");
  await page.screenshot({ path: 'studio_screenshot.png' });

  console.log("Checking element bounds...");
  const elements = await page.evaluate(() => {
    return {
      canvas: document.querySelector('canvas')?.getBoundingClientRect(),
      layout: document.querySelector('.flexlayout__layout')?.getBoundingClientRect(),
      tabset: document.querySelector('.flexlayout__tabset')?.getBoundingClientRect(),
      viewportContainer: document.querySelector('.sg-viewport-container')?.getBoundingClientRect(),
      uiOverlays: Array.from(document.querySelectorAll('.sg-glass, .pointer-events-auto')).map(el => ({
        className: el.className,
        rect: el.getBoundingClientRect()
      }))
    };
  });
  console.log("Elements bounds:", JSON.stringify(elements, null, 2));

  await browser.close();
  console.log("Done.");
})();

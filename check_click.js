const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  await page.goto('http://localhost:3000/studio', { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 5000));

  // Find out what element is at the center of the screen
  const centerElement = await page.evaluate(() => {
    const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    if (!el) return null;
    
    let current = el;
    const path = [];
    while (current && current !== document.body) {
      let desc = current.tagName.toLowerCase();
      if (current.id) desc += '#' + current.id;
      if (current.className && typeof current.className === 'string') {
        desc += '.' + current.className.split(' ').join('.');
      }
      path.push(desc);
      current = current.parentElement;
    }
    return {
      element: path[0],
      path: path
    };
  });

  console.log("Element at center:", JSON.stringify(centerElement, null, 2));

  await browser.close();
})();

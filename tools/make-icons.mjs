// Erzeugt icons/*.png aus tools/icon.html.
// Voraussetzung: lokaler Server auf Port 8080 (z.B. `npm start`) und Playwright.
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const browser = await chromium.launch();
const page = await browser.newPage();
async function render(zoom, file, size) {
  await page.goto(`http://localhost:8080/tools/icon.html?zoom=${zoom}`);
  await page.waitForFunction(() => window.done);
  const data = await page.evaluate((size) => {
    const src = document.getElementById('c');
    const c = document.createElement('canvas');
    c.width = c.height = size;
    c.getContext('2d').drawImage(src, 0, 0, size, size);
    return c.toDataURL('image/png');
  }, size);
  writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
  console.log('geschrieben:', file);
}
await render(1, 'icons/icon-512.png', 512);
await render(1, 'icons/icon-192.png', 192);
await render(0.78, 'icons/icon-maskable-512.png', 512);
await browser.close();

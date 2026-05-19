import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlFile = path.join(__dirname, 'card-dette-interets.html');
const outFile  = path.join(__dirname, 'card-dette-interets.png');

const browser = await puppeteer.launch({ headless: 'new' });
const page    = await browser.newPage();

await page.setViewport({ width: 1200, height: 675, deviceScaleFactor: 2 });
await page.goto('file:///' + htmlFile.replace(/\\/g, '/'));
await page.waitForTimeout(300);

await page.screenshot({
  path: outFile,
  type: 'png',
  clip: { x: 0, y: 0, width: 1200, height: 675 }
});

await browser.close();
console.log('✅ Saved:', outFile);

// save-cookies.js
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle2' });

  console.log('➡️ Please login manually in the browser window.');
  await page.waitForNavigation({ waitUntil: 'networkidle2' });

  // Wait until user logs in
  console.log('⏳ Waiting 60 seconds for manual login...');
  await new Promise(r => setTimeout(r, 60000));

  const cookies = await page.cookies();
  fs.writeFileSync('./cookies.json', JSON.stringify(cookies, null, 2));
  console.log('✅ Cookies saved to cookies.json');

  await browser.close();
})();

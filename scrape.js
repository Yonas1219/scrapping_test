const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function scrapeInstagramProfile(username) {
  const url = `https://www.instagram.com/${username}/`;

  const browser = await puppeteer.launch({
    headless: false, // Turn this to true later
    slowMo: 50,       // Adds delay between actions
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Spoof user-agent and viewport
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  );
  await page.setViewport({ width: 1200, height: 800 });

  try {
    console.log(`🌐 Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Wait for the username to appear in meta tags
    await page.waitForSelector('meta[property="og:title"]', { timeout: 60000 });

    const profileData = await page.evaluate(() => {
      const fullName = document.querySelector('meta[property="og:title"]')?.content?.split('(')[0]?.trim() || null;
      const profilePic = document.querySelector('meta[property="og:image"]')?.content || null;
      const description = document.querySelector('meta[property="og:description"]')?.content || null;

      let posts, followers, following;
      if (description) {
        [followers, following, posts] = description.split(' - ')[0].split(',').map(x => x.trim());
      }

      return {
        fullName,
        followers,
        following,
        posts,
        profilePic,
        description
      };
    });

    console.log(`✅ Scraped Data for @${username}:`, profileData);
  } catch (err) {
    console.error(`❌ Error scraping @${username}:`, err.message);
  } finally {
    await browser.close();
  }
}

// ✅ Try a real public account
scrapeInstagramProfile('addisbanter'); // or 'natgeo', '9gag', etc.

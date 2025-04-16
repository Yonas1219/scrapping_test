const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());

async function scrapeInstagramProfile(page, username) {
  const url = `https://www.instagram.com/${username}/`;

  try {
    console.log(`🌐 Navigating to ${url}...`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    await page.waitForSelector('meta[property="og:title"]', { timeout: 60000 });

    const profileData = await page.evaluate(() => {
      const fullName =
        document
          .querySelector('meta[property="og:title"]')
          ?.content?.split("(")[0]
          ?.trim() || null;
      const profilePic =
        document.querySelector('meta[property="og:image"]')?.content || null;
      const description =
        document.querySelector('meta[property="og:description"]')?.content || null;

      let posts, followers, following;
      if (description) {
        [followers, following, posts] = description
          .split(" - ")[0]
          .split(",")
          .map((x) => x.trim());
      }

      const bio =
        document.querySelector("header section > div.-vDIg span")?.innerText || null;
      const externalLink =
        document.querySelector('header section a[rel*="me"]')?.href || null;

      return {
        fullName,
        followers,
        following,
        posts,
        profilePic,
        description,
        bio,
        externalLink,
      };
    });

    console.log(`✅ Scraped Data for @${username}:`, profileData);
    return { username, ...profileData };
  } catch (err) {
    console.error(`❌ Error scraping @${username}:`, err.message);
    return { username, error: err.message };
  }
}

async function scrapeMultipleUsers(usernames) {
  const browser = await puppeteer.launch({
    headless: false, // Change to true in production
    slowMo: 50,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
  );
  await page.setViewport({ width: 1200, height: 800 });

  const results = [];

  for (const username of usernames) {
    const data = await scrapeInstagramProfile(page, username);
    results.push(data);
  }

  await browser.close();

  // Save results to a file if needed
  const fs = require("fs");
  fs.writeFileSync("scraped_users.json", JSON.stringify(results, null, 2));

  console.log(`📝 Saved all data to scraped_users.json`);
}

// ✅ Call with list of usernames
scrapeMultipleUsers(["natgeo", "instagram", "cristiano", "dr_merhawi"]);

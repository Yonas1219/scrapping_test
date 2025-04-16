// instagram-scraper.js
const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const natural = require('natural');
const compromise = require('compromise');
const sentiment = require('sentiment');

class InstagramScraper {
  constructor() {
    this.tokenizer = new natural.WordTokenizer();
    this.fitnessKeywords = [
      'fitness', 'trainer', 'coach', 'workout', 'exercise',
      'gym', 'nutrition', 'health', 'wellness', 'personal trainer',
      'bodybuilding', 'weight loss', 'muscle', 'fit', 'strength'
    ];
  }

  async scrapeProfile(username) {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    try {
      // Set a realistic user agent
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Navigate to profile with realistic delays
      await page.goto(`https://www.instagram.com/${username}/`, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      // Wait for critical elements to load
      await page.waitForSelector('header section', { timeout: 10000 });
      
      // Extract profile data
      const profileData = await page.evaluate(() => {
        const bioElement = document.querySelector('header section div');
        const imgElement = document.querySelector('header img');
        const links = Array.from(document.querySelectorAll('header a'))
          .map(a => a.href)
          .filter(href => !href.includes('instagram.com'));
        
        return {
          username: document.querySelector('header section h2')?.textContent.trim(),
          bio: bioElement ? bioElement.textContent.trim() : '',
          profile_pic: imgElement ? imgElement.src : '',
          external_links: links
        };
      });
      
      await browser.close();
      
      // Additional processing
      const linktreeData = await this.processLinktree(profileData.external_links);
      const nicheAnalysis = this.detectNiche(profileData.bio);
      const ctaData = this.generateCTA(profileData, linktreeData);
      
      return {
        ...profileData,
        linktree: linktreeData,
        niche: nicheAnalysis,
        cta: ctaData
      };
    } catch (error) {
      await browser.close();
      console.error(`Error scraping ${username}:`, error.message);
      throw error;
    }
  }

  async processLinktree(links) {
    const linktreeUrl = links.find(link => 
      link.includes('linktr.ee') || 
      link.toLowerCase().includes('linktree'));
    
    if (!linktreeUrl) return { found: false };
    
    try {
      const { data } = await axios.get(linktreeUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      const $ = cheerio.load(data);
      const headline = $('h1').text().trim();
      const links = [];
      
      $('a[data-testid="LinkButton"]').each((i, element) => {
        links.push({
          title: $(element).text().trim(),
          url: $(element).attr('href')
        });
      });
      
      return {
        found: true,
        headline,
        links
      };
    } catch (error) {
      console.error('Error parsing Linktree:', error.message);
      return { found: false, error: error.message };
    }
  }

  detectNiche(bio) {
    if (!bio || bio.length < 3) return { niche: 'unknown', confidence: 0 };
    
    const tokens = this.tokenizer.tokenize(bio.toLowerCase());
    const fitnessScore = tokens.filter(token => 
      this.fitnessKeywords.includes(token)
    ).length;
    
    const doc = compromise(bio);
    const isCoach = (doc.has('#Person #Noun') && 
                   (doc.has('coach') || doc.has('trainer')));
    
    return {
      niche: fitnessScore >= 2 || isCoach ? 'fitness' : 'general',
      isFitnessInfluencer: fitnessScore >= 2 || isCoach,
      confidence: Math.min(100, fitnessScore * 20 + (isCoach ? 40 : 0))
    };
  }

  generateCTA(profileData, linktreeData) {
    const bioSentiment = sentiment(profileData.bio);
    let cta, theme;
    
    if (profileData.niche?.isFitnessInfluencer) {
      theme = 'fitness';
      if (bioSentiment.score > 2) {
        cta = "Ready to transform your fitness journey? Check out my programs below!";
      } else if (bioSentiment.score < -1) {
        cta = "Struggling with your fitness goals? I can help - explore my resources!";
      } else {
        cta = "Take the next step in your fitness journey with my coaching services!";
      }
    } else {
      theme = 'general';
      cta = "Connect with me through the links below!";
    }
    
    if (linktreeData.found && linktreeData.links) {
      const freeGuide = linktreeData.links.find(link => 
        link.title.toLowerCase().includes('free guide'));
      if (freeGuide) {
        cta = `Grab your free guide: "${freeGuide.title}"!`;
      }
    }
    
    return {
      text: cta,
      theme,
      suggestedLinksOrder: this.prioritizeLinks(
        linktreeData.found ? linktreeData.links : [],
        theme
      )
    };
  }

  prioritizeLinks(links, theme) {
    if (!links || links.length === 0) return [];
    
    if (theme === 'fitness') {
      return [...links].sort((a, b) => {
        const aScore = a.title.toLowerCase().includes('program') || 
                      a.title.toLowerCase().includes('coaching') ? 1 : 0;
        const bScore = b.title.toLowerCase().includes('program') || 
                      b.title.toLowerCase().includes('coaching') ? 1 : 0;
        return bScore - aScore;
      });
    }
    return links;
  }
}

// Get username from command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Please provide an Instagram username as an argument');
  console.log('Usage: node instagram-scraper.js <username>');
  process.exit(1);
}

const username = args[0];

// Main execution
(async () => {
  try {
    const scraper = new InstagramScraper();
    
    console.log(`Scraping Instagram profile for @${username}...`);
    const profileData = await scraper.scrapeProfile(username);
    
    console.log('\nScraping Results:');
    console.log('-----------------');
    console.log(`Username: @${profileData.username}`);
    console.log(`Bio: ${profileData.bio}`);
    console.log(`Profile Picture: ${profileData.profile_pic}`);
    console.log(`Niche: ${profileData.niche.niche} (${profileData.niche.confidence}% confidence)`);
    
    if (profileData.linktree.found) {
      console.log('\nLinktree Links:');
      profileData.linktree.links.forEach(link => {
        console.log(`- ${link.title}: ${link.url}`);
      });
    }
    
    console.log(`\nSuggested CTA: ${profileData.cta.text}`);
  } catch (error) {
    console.error('Scraping failed:', error);
  }
})();
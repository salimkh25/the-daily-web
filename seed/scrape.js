// scraper script - pulls real articles from BBC and NBC News RSS feeds
// saves everything to seed/scraped.json so the seed script can use them
// run with: node seed/scrape.js
// note: this just reads public RSS feeds, not doing anything sketchy

const fs = require('fs');
const path = require('path');

// using dynamic import bc node-fetch v3 is ESM only
async function fetchFeed(url) {
  const { default: fetch } = await import('node-fetch');
  const res = await fetch(url, {
    headers: {
      // pretend to be a browser so some feeds dont block us
      'User-Agent': 'Mozilla/5.0 (compatible; news-reader/1.0)'
    }
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

// all the feeds we're pulling from - mix of bbc and nbc
const FEEDS = [
  // BBC feeds
  { url: 'https://feeds.bbci.co.uk/news/rss.xml',                          source: 'BBC', category: 'World' },
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml',                    source: 'BBC', category: 'World' },
  { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml',               source: 'BBC', category: 'Tech' },
  { url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml',  source: 'BBC', category: 'Science' },
  { url: 'https://feeds.bbci.co.uk/news/politics/rss.xml',                 source: 'BBC', category: 'Politics' },
  { url: 'https://feeds.bbci.co.uk/news/health/rss.xml',                   source: 'BBC', category: 'Health' },
  { url: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml',   source: 'BBC', category: 'Entertainment' },
  { url: 'https://feeds.bbci.co.uk/news/business/rss.xml',                 source: 'BBC', category: 'Business' },
  { url: 'https://feeds.bbci.co.uk/sport/0/rss.xml',                       source: 'BBC', category: 'Sports' },
  { url: 'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml',        source: 'BBC', category: 'World' },
  { url: 'https://feeds.bbci.co.uk/news/world/europe/rss.xml',             source: 'BBC', category: 'World' },
  { url: 'https://feeds.bbci.co.uk/news/world/africa/rss.xml',             source: 'BBC', category: 'World' },
  // NBC feeds
  { url: 'https://feeds.nbcnews.com/nbcnews/public/news',                  source: 'NBC', category: 'World' },
  { url: 'http://feeds.nbcnews.com/feeds/topstories',                      source: 'NBC', category: 'World' },
  { url: 'http://feeds.nbcnews.com/feeds/nbcpolitics',                     source: 'NBC', category: 'Politics' },
];

function parseItems(xmlText) {
  // quick and dirty xml parsing - we just need title, description, link, pubDate
  // using regex instead of a full parser to keep things simple
  const items = [];
  const itemRegex = /<item[\s\S]*?<\/item>/g;
  const matches = xmlText.match(itemRegex) || [];

  for (const item of matches) {
    const get = (tag) => {
      // handle both plain tags and CDATA
      const m = item.match(new RegExp(`<${tag}(?:[^>]*)>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`, 'i'));
      return m ? m[1].trim() : '';
    };

    const title = get('title');
    const description = get('description');
    const link = get('link') || get('guid');
    const pubDate = get('pubDate');

    if (!title || !description) continue;

    // clean up html tags from the description
    const cleanDesc = description.replace(/<[^>]+>/g, '').trim();
    if (cleanDesc.length < 20) continue;

    items.push({ title, description: cleanDesc, link, pubDate });
  }

  return items;
}

async function scrape() {
  console.log('Starting scrape from BBC and NBC RSS feeds...');
  const allArticles = [];
  let failedFeeds = 0;

  for (const feed of FEEDS) {
    try {
      console.log(`  Fetching: ${feed.url}`);
      const xml = await fetchFeed(feed.url);
      const items = parseItems(xml);

      for (const item of items) {
        allArticles.push({
          title: item.title,
          summary: item.description.slice(0, 300), // cap summary length
          content: item.description,
          category: feed.category,
          source: feed.source,
          sourceUrl: item.link,
          // use the actual pub date if available, otherwise now
          publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        });
      }

      console.log(`    got ${items.length} articles from ${feed.source} (${feed.category})`);

      // small delay between requests so we dont look like a bot hammering the server
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.warn(`    FAILED: ${feed.url} - ${err.message}`);
      failedFeeds++;
    }
  }

  // remove dupes by title
  const seen = new Set();
  const unique = allArticles.filter(a => {
    if (seen.has(a.title)) return false;
    seen.add(a.title);
    return true;
  });

  console.log(`\nScraped ${unique.length} unique articles from ${FEEDS.length - failedFeeds} feeds (${failedFeeds} failed)`);

  const outPath = path.join(__dirname, 'scraped.json');
  fs.writeFileSync(outPath, JSON.stringify(unique, null, 2));
  console.log(`Saved to ${outPath}`);

  if (unique.length < 100) {
    console.warn('Warning: got less than 100 articles, some feeds may have been blocked');
  }
}

scrape().catch(err => {
  console.error('Scrape failed:', err);
  process.exit(1);
});

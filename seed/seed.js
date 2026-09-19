// seed script - fills the db with real news articles scraped from BBC and NBC
// run with: npm run seed
// WARNING: this deletes everything first so dont run on production lol
//
// depends on seed/scraped.json - run "node seed/scrape.js" first if that file is missing

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Article = require('../src/models/Article');
const Comment = require('../src/models/Comment');
const View = require('../src/models/View');

// load the scraped articles from file
const scrapedPath = path.join(__dirname, 'scraped.json');
if (!fs.existsSync(scrapedPath)) {
  console.error('scraped.json not found - run "node seed/scrape.js" first!');
  process.exit(1);
}
const scrapedArticles = JSON.parse(fs.readFileSync(scrapedPath, 'utf8'));
console.log(`Loaded ${scrapedArticles.length} scraped articles from file`);

// just picks a random element from an array
function r(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// sample comments from fake readers - makes it look more realistic
const sampleComments = [
  'really interesting read',
  'thanks for sharing this',
  'wow i didnt know about this',
  'great article!',
  'this is kinda scary ngl',
  'been following this story for a while',
  'hard to believe this is happening',
  'more people need to see this',
  'good summary of whats going on',
  'first time hearing about this, very eye opening',
];

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set - copy .env.example to .env first.');
  await mongoose.connect(uri);

  // wipe everything so we start fresh
  console.log('Clearing existing data...');
  await User.deleteMany({});
  await Article.deleteMany({});
  await Comment.deleteMany({});
  await View.deleteMany({});

  // create some users - 2 reporters and 1 editor
  console.log('Creating users...');
  const reporter1 = await User.create({ username: 'salim', password: '12345678', role: 'reporter', displayName: 'Salim K' });
  const reporter2 = await User.create({ username: 'reporter2', password: 'password', role: 'reporter', displayName: 'John Smith' });
  const editor = await User.create({ username: 'salom2', password: '12345678', role: 'editor', displayName: 'Editor Boss' });

  console.log('\n=== Demo Credentials ===');
  console.log('  Reporter: salim / 12345678');
  console.log('  Editor:   salom2 / 12345678');
  console.log('========================\n');

  // we need 510+ articles. if scraped.json has less we cycle thru it
  const TARGET = 510;
  const articles = [];

  for (let i = 0; i < TARGET; i++) {
    // cycle thru the scraped data if we run out
    const scraped = scrapedArticles[i % scrapedArticles.length];

    // most get published, some stay in other states for testing
    let status;
    if (i < 400) status = 'published';           // 400 published
    else if (i < 430) status = 'pending';         // 30 pending review
    else if (i < 460) status = 'returned';        // 30 returned for fixes
    else status = 'draft';                        // rest are drafts

    const author = i % 3 === 0 ? reporter1._id : reporter2._id;

    const articleData = {
      title: scraped.title,
      summary: scraped.summary,
      body: scraped.content,    // the model uses `body`, scraper saves as `content`
      category: scraped.category,
      author,
      status,
    };

    if (status === 'published') {
      // spread publish dates over the last 30 days so analytics looks nice
      articleData.publishedAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);

      // snapshot the content into the published subdoc
      articleData.published = {
        title: scraped.title,
        summary: scraped.summary,
        body: scraped.content,
        category: scraped.category,
      };

      // ~30% of published articles have been updated at least once (for the analytics graph)
      if (Math.random() < 0.3) {
        const updateTime = new Date(articleData.publishedAt.getTime() + Math.random() * 5 * 24 * 60 * 60 * 1000);
        articleData.updates = [updateTime];
      }

      articleData.viewsCount = Math.floor(Math.random() * 800) + 10;
    } else if (status === 'returned') {
      articleData.editorNote = 'Please add more context and check the sources.';
    }

    articles.push(articleData);
  }

  // bulk insert for speed
  console.log(`Inserting ${articles.length} articles...`);
  const inserted = await Article.insertMany(articles);
  console.log(`Inserted ${inserted.length} articles`);

  // add comments and view-bucket data for published articles
  console.log('Adding comments and view data...');
  let commentCount = 0;
  let viewBucketCount = 0;

  for (const doc of inserted) {
    if (doc.status !== 'published') continue;

    // about half get a comment
    if (Math.random() < 0.5) {
      await Comment.create({
        article: doc._id,
        author: r(sampleComments).split(' ')[0] + ' Reader', // use `author` not authorName
        body: r(sampleComments)
      });
      commentCount++;
    }

    // create hourly view buckets starting from when it was published
    if (doc.viewsCount > 0) {
      const numBuckets = Math.floor(Math.random() * 8) + 3; // 3-10 buckets per article
      for (let j = 0; j < numBuckets; j++) {
        const bucket = new Date(doc.publishedAt);
        bucket.setHours(bucket.getHours() + j * 4, 0, 0, 0); // every 4 hours
        await View.create({
          article: doc._id,
          bucket,  // the View model calls it `bucket` not `hour`
          count: Math.floor(Math.random() * 50) + 1
        });
        viewBucketCount++;
      }
    }
  }

  console.log(`\n=== Seed Complete ===`);
  console.log(`  Articles:     ${inserted.length}`);
  console.log(`  Comments:     ${commentCount}`);
  console.log(`  View buckets: ${viewBucketCount}`);
  console.log(`====================`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

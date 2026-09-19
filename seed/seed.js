// seed/seed.js — [TODO — GUIDE step 13]  demo data
//
// Run with:  npm run seed
//
// The spec requires demo data that shows EVERY feature. At minimum:
//   - 500+ articles across different categories and statuses
//   - several reporter users + at least one editor (with hashed passwords)
//   - comments on articles
//   - articles in each workflow state: draft, pending, published, returned
//   - several PUBLISHED articles that were updated a few times after first publishing
//   - view data over time (enough points to make the Impact Analytics graph meaningful),
//     including the update-publish markers
//
// Structure to follow:
//   1) connect to Mongo (reuse config/db.js or mongoose.connect with process.env.MONGODB_URI)
//   2) clear the collections you seed (deleteMany) so re-running is idempotent
//   3) create users -> articles (assign authors) -> comments -> view buckets
//   4) log a summary and disconnect
//
// Keep passwords OUT of the repo. Seed users can have simple known dev passwords, but never
// commit a real .env. Print the demo credentials to the console when seeding.

const mongoose = require('mongoose');
const User = require('../src/models/User');
const Article = require('../src/models/Article');
const Comment = require('../src/models/Comment');
const View = require('../src/models/View');

const categories = ['World', 'Politics', 'Tech', 'Science', 'Sports', 'Entertainment'];
const statuses = ['draft', 'pending', 'published', 'returned'];

function r(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set — copy .env.example to .env first.');
  await mongoose.connect(uri);

  console.log('Clearing existing data...');
  await User.deleteMany({});
  await Article.deleteMany({});
  await Comment.deleteMany({});
  await View.deleteMany({});

  console.log('Creating users...');
  const reporter1 = await User.create({ username: 'reporter1', password: 'password', role: 'reporter', displayName: 'Jane Doe' });
  const reporter2 = await User.create({ username: 'reporter2', password: 'password', role: 'reporter', displayName: 'John Smith' });
  const editor = await User.create({ username: 'editor1', password: 'password', role: 'editor', displayName: 'Boss Editor' });
  
  console.log('Credentials for demo:');
  console.log('  Reporter: reporter1 / password');
  console.log('  Editor:   editor1 / password');

  console.log('Creating 500+ articles...');
  const articles = [];
  for (let i = 0; i < 510; i++) {
    // 80% published, 20% others
    const isPublished = Math.random() < 0.8;
    const status = isPublished ? 'published' : r(['draft', 'pending', 'returned']);
    
    const author = i % 2 === 0 ? reporter1._id : reporter2._id;
    const category = r(categories);
    const title = `Demo Article ${i} on ${category}`;
    const summary = `This is a short summary for demo article ${i} exploring the depths of ${category}.`;
    const content = `This is the full body content for demo article ${i}. It has multiple paragraphs.\n\nHere is the second paragraph with more details about ${category}.`;
    const image = `https://picsum.photos/seed/${i}/800/400`;

    const articleData = {
      title,
      summary,
      content,
      category,
      image,
      author,
      status
    };

    if (status === 'published') {
      articleData.publishedAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000); // random in last 30 days
      articleData.published = { title, summary, content, category, image };
      
      // Simulate an editor update on some articles
      if (Math.random() < 0.3) {
        articleData.updates = [new Date(articleData.publishedAt.getTime() + 1000000)];
      }
      
      articleData.viewsCount = Math.floor(Math.random() * 500);
    } else if (status === 'returned') {
      articleData.editorNote = 'Please expand the second paragraph.';
    }

    articles.push(articleData);
  }

  const insertedArticles = await Article.insertMany(articles);

  console.log('Creating comments and analytics...');
  for (let doc of insertedArticles) {
    if (doc.status === 'published' && Math.random() < 0.5) {
      await Comment.create({
        article: doc._id,
        authorName: 'Guest Reader',
        body: `Great article on ${doc.category}!`
      });
    }

    if (doc.status === 'published' && doc.viewsCount > 0) {
      // Create some View buckets
      for (let j = 0; j < 5; j++) {
        const bucket = new Date(doc.publishedAt);
        bucket.setHours(bucket.getHours() + j, 0, 0, 0);
        await View.create({
          article: doc._id,
          hour: bucket,
          count: Math.floor(Math.random() * 20) + 1
        });
      }
    }
  }

  console.log('Seeding complete!');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

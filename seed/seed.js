// seed script - fills the db with fake data for testing/demo purposes
// run with: npm run seed
// WARNING: this deletes everything first so dont run on production lol

const mongoose = require('mongoose');
const User = require('../src/models/User');
const Article = require('../src/models/Article');
const Comment = require('../src/models/Comment');
const View = require('../src/models/View');

const categories = ['World', 'Politics', 'Tech', 'Science', 'Sports', 'Entertainment'];

// just picks a random element from an array
function r(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

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
  const reporter1 = await User.create({ username: 'reporter1', password: 'password', role: 'reporter', displayName: 'Jane Doe' });
  const reporter2 = await User.create({ username: 'reporter2', password: 'password', role: 'reporter', displayName: 'John Smith' });
  const editor = await User.create({ username: 'editor1', password: 'password', role: 'editor', displayName: 'Boss Editor' });

  console.log('Credentials for demo:');
  console.log('  Reporter: reporter1 / password');
  console.log('  Editor:   editor1 / password');

  // build all the articles in memory first then insertMany for speed
  console.log('Creating 500+ articles...');
  const articles = [];
  for (let i = 0; i < 510; i++) {
    // roughly 80% published, the rest are various other statuses
    const isPublished = Math.random() < 0.8;
    const status = isPublished ? 'published' : r(['draft', 'pending', 'returned']);

    const author = i % 2 === 0 ? reporter1._id : reporter2._id;
    const category = r(categories);
    const title = `Demo Article ${i} on ${category}`;
    const summary = `Short summary for article ${i} about ${category}.`;
    const body = `Full content for article ${i}.\n\nThis is the second paragraphe with more info about ${category}.`;
    const image = `https://picsum.photos/seed/${i}/800/400`;

    const articleData = { title, summary, body, category, image, author, status };

    if (status === 'published') {
      articleData.publishedAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      articleData.published = { title, summary, body, category, image };

      // some articles got updated after first publish - needed for the analytics graph
      if (Math.random() < 0.3) {
        articleData.updates = [new Date(articleData.publishedAt.getTime() + 1000000)];
      }

      articleData.viewsCount = Math.floor(Math.random() * 500);
    } else if (status === 'returned') {
      articleData.editorNote = 'Please expand the second paragraphe.';
    }

    articles.push(articleData);
  }

  const insertedArticles = await Article.insertMany(articles);

  // add comments and view buckets for published articles
  console.log('Creating comments and analytics...');
  for (let doc of insertedArticles) {
    if (doc.status === 'published' && Math.random() < 0.5) {
      await Comment.create({
        article: doc._id,
        author: 'Guest Reader',
        body: `Great article on ${doc.category}!`
      });
    }

    // create hourly view buckets so the chart has real data to plot
    if (doc.status === 'published' && doc.viewsCount > 0) {
      for (let j = 0; j < 5; j++) {
        const bucket = new Date(doc.publishedAt);
        bucket.setHours(bucket.getHours() + j, 0, 0, 0);
        await View.create({
          article: doc._id,
          bucket,
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

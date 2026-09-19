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

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set — copy .env.example to .env first.');
  await mongoose.connect(uri);

  // TODO: implement seeding (see the checklist above).
  console.log('Seed script not implemented yet — see GUIDE.md step 13.');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

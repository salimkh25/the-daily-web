// src/controllers/articleController.js — [TODO — you build this]
//
// Public + REST reading of articles. Copy the SHAPE from commentController.js
// (async, try/catch, next(err), server-side validation, right status codes).
//
// Handlers you'll need (names are suggestions):
//
//   renderHome(req, res, next)      GET /            -> render 'home' with the first page of
//                                                       PUBLISHED articles for server render + SEO.
//   renderArticle(req, res, next)   GET /article/:id -> load one PUBLISHED article, render 'article'
//                                                       with full body IN THE HTML (SEO requirement),
//                                                       plus its comments (server-rendered), then
//                                                       record a view (see View model / statsController).
//   list(req, res, next)            GET /api/articles-> JSON list for Ajax. MUST support:
//                                                         ?page= &limit=20   (infinite scroll)
//                                                         ?search=           (search by title — text index)
//                                                         ?category=
//                                                         ?seen= / unseen    (viewed / not-viewed filter)
//                                                         ?sort=date|popular
//                                                       Return only PUBLISHED articles here.
//
// CRUD for reporters/editors lives in reporterController.js and editorController.js so the
// permission boundaries stay obvious.
//
// Tips:
//   - Only ever expose `status: 'published'` articles on the public side.
//   - For the "viewed/not-viewed" filter, decide how you track what a guest has seen
//     (e.g. an array of ids in the session, or a cookie).
//   - Paginate with .skip()/.limit() or a cursor; add indexes so it stays fast at 500+ articles.

const mongoose = require('mongoose');
const Article = require('../models/Article');
const View = require('../models/View');
const Comment = require('../models/Comment');
const logger = require('../utils/logger');

// The public always sees the last APPROVED version, which lives in `published`.
// This maps that onto the fields the views/JSON expect. An article "is public" once it
// has a publishedAt date — even while a newer edit sits in `pending`.
function toPublicArticle(a) {
  const p = a.published || {};
  return { ...a, title: p.title, summary: p.summary, body: p.body, image: p.image, category: p.category };
}

// GET / -> render 'home'
async function renderHome(req, res, next) {
  try {
    const raw = await Article.find({ publishedAt: { $ne: null } })
      .sort({ publishedAt: -1 })
      .limit(20)
      .populate('author', 'displayName')
      .lean();
    const articles = raw.map(toPublicArticle); // show the last approved content

    // Top 3 go to the hero section, the rest to the feed
    const hero = articles.slice(0, 3);
    const feed = articles.slice(3);

    res.render('home', {
      title: 'The Daily Web',
      hero: hero.length > 0 ? hero : null,
      articles: feed
    });
  } catch (err) {
    next(err);
  }
}

// GET /article/:id -> load one published article, render 'article'
async function renderArticle(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).render('error', { message: 'Article not found' });
    }

    const article = await Article.findOne({ _id: id, publishedAt: { $ne: null } })
      .populate('author', 'displayName')
      .lean();

    if (!article) {
      return res.status(404).render('error', { message: 'Article not found' });
    }

    // Fetch comments
    const comments = await Comment.find({ article: id })
      .sort({ createdAt: -1 })
      .lean();

    // Fire-and-forget view counting
    // 1. Increment overall views on Article
    Article.updateOne({ _id: id }, { $inc: { viewsCount: 1 } })
      .catch((err) => logger.error('viewsCount increment failed:', err.message));
    // 2. Increment hourly bucket on View
    const bucket = new Date();
    bucket.setMinutes(0, 0, 0); // round to start of hour
    View.updateOne(
      { article: id, bucket },
      { $inc: { count: 1 } },
      { upsert: true }
    ).catch((err) => logger.error('view bucket increment failed:', err.message));

    // Show the last approved content (from `published`).
    const mappedArticle = toPublicArticle(article);

    res.render('article', {
      title: `${mappedArticle.title} — The Daily Web`,
      article: mappedArticle,
      comments
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/articles -> JSON list for Ajax
async function list(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const query = { publishedAt: { $ne: null } };

    if (req.query.search) {
      query.$text = { $search: req.query.search };
    }

    if (req.query.category) {
      query['published.category'] = req.query.category;
    }

    let sort = { publishedAt: -1 };
    if (req.query.sort === 'popular') {
      sort = { viewsCount: -1 };
    } else if (req.query.search) {
      // For text search, sort by score if no explicit sort was chosen, otherwise fallback to date
      sort = { score: { $meta: 'textScore' } };
    }

    const articles = await Article.find(query, req.query.search ? { score: { $meta: 'textScore' } } : {})
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('author', 'displayName')
      .lean();

    // Show the last approved content (from `published`).
    const mappedArticles = articles.map(toPublicArticle);

    res.json(mappedArticles);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  renderHome,
  renderArticle,
  list
};

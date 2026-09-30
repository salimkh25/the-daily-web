// public side of the articles: the home page, the article page and the feed api (open to everyone).
//
// the public only ever sees the LAST APPROVED version of an article, which lives in `article.published`.
// an article is public once it has a publishedAt date - even while a newer edit waits for the editor,
// readers keep getting the approved copy. reporter/editor CRUD lives in reporterController/editorController.

const mongoose = require('mongoose');
const Article = require('../models/Article');
const View = require('../models/View');
const Comment = require('../models/Comment');
const { buildCategoryFilter, displayCategory } = require('../utils/categories');

const PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

// only what a feed card needs. keeps the json small and never sends editor notes,
// the workflow status or an unapproved draft to the browser.
const FEED_FIELDS = 'published.title published.summary published.image published.category publishedAt author viewsCount';
const PAGE_FIELDS = FEED_FIELDS + ' published.body';

function toPublicArticle(a, { withBody = false } = {}) {
  const p = a.published || {};
  const out = {
    _id: a._id,
    title: p.title,
    summary: p.summary,
    image: p.image,
    category: p.category,
    author: a.author, // populated -> { _id, displayName }
    publishedAt: a.publishedAt,
    viewsCount: a.viewsCount,
  };
  if (withBody) out.body = p.body;
  return out;
}

// query string -> mongo filter + sort. used by BOTH the server-rendered first page and the
// ajax api, so page 2 from the api always continues exactly where page 1 stopped.
function buildFeedQuery(req) {
  const query = { publishedAt: { $ne: null } };
  const search = (req.query.search || '').trim();
  const catFilter = buildCategoryFilter(req.query.category);

  if (search) query.$text = { $search: search }; // text index on published title/summary/body
  if (catFilter) query['published.category'] = catFilter;

  // read / unread filter - the articles this visitor opened are remembered in their session.
  // no history yet means "read" is simply empty and "unread" is everything.
  const seen = req.query.seen;
  if (seen === 'seen' || seen === 'unseen') {
    const seenIds = (req.session.seenArticles || []).filter((id) => mongoose.isValidObjectId(id));
    query._id = seen === 'seen' ? { $in: seenIds } : { $nin: seenIds };
  }

  // _id is a tie-breaker: two articles with the same view count (or date) always come back in the
  // same order, otherwise skip/limit paging could repeat or skip articles between pages
  const sort = req.query.sort === 'popular'
    ? { viewsCount: -1, _id: -1 }
    : { publishedAt: -1, _id: -1 };

  return { query, sort, search };
}

// ?page / ?limit from the client are untrusted - clamp them (a negative skip crashes the query)
function readPaging(req) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(req.query.limit, 10) || PAGE_SIZE));
  return { limit, skip: (page - 1) * limit };
}

// GET /  - first page of the feed rendered on the server, feed.js takes over from there
async function renderHome(req, res, next) {
  try {
    const { query, sort, search } = buildFeedQuery(req);
    const category = displayCategory(req.query.category);
    const sortKey = req.query.sort === 'popular' ? 'popular' : 'date';
    const seenKey = ['seen', 'unseen'].includes(req.query.seen) ? req.query.seen : '';

    const [firstPage, mostReadRaw, latestRaw] = await Promise.all([
      Article.find(query).select(FEED_FIELDS).sort(sort).limit(PAGE_SIZE).populate('author', 'displayName').lean(),
      Article.find({ publishedAt: { $ne: null } }).select(FEED_FIELDS).sort({ viewsCount: -1, _id: -1 }).limit(5).lean(),
      Article.findOne({ publishedAt: { $ne: null } }).select(FEED_FIELDS).sort({ publishedAt: -1, _id: -1 }).lean(),
    ]);
    const articles = firstPage.map((a) => toPublicArticle(a));

    // the 3-story hero only belongs on the plain front page (newest first, no filters).
    // it's just page 1 split in two, so feed.js still asks for page 2 next.
    const plainFrontPage = !category && !search && !seenKey && sortKey === 'date';
    const showHero = plainFrontPage && articles.length >= 3;

    let pageTitle = 'The Daily Web';
    if (search) pageTitle = `Search: "${search}" — The Daily Web`;
    else if (category) pageTitle = `${category} — The Daily Web`;

    res.render('home', {
      title: pageTitle,
      currentCategory: category,
      currentSearch: search,
      currentSort: sortKey,
      currentSeen: seenKey,
      hero: showHero ? articles.slice(0, 3) : null,
      articles: showHero ? articles.slice(3) : articles,
      mostRead: mostReadRaw.map((a) => toPublicArticle(a)),
      latestBrief: latestRaw ? toPublicArticle(latestRaw) : null,
    });
  } catch (err) {
    next(err);
  }
}

// GET /article/:id  - the full article is in the initial html (SEO), no javascript needed to read it
async function renderArticle(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).render('error', { status: 404, message: 'Article not found' });
    }

    const article = await Article.findOne({ _id: id, publishedAt: { $ne: null } })
      .select(PAGE_FIELDS)
      .populate('author', 'displayName')
      .lean();
    if (!article) {
      return res.status(404).render('error', { status: 404, message: 'Article not found' });
    }

    const comments = await Comment.find({ article: id }).sort({ createdAt: -1 }).lean();

    // every visit counts toward the view stats (hourly bucket + total)
    View.record(id);

    // remember it for this visitor's read/unread filter
    req.session.seenArticles = req.session.seenArticles || [];
    if (!req.session.seenArticles.includes(id)) req.session.seenArticles.push(id);

    const publicArticle = toPublicArticle(article, { withBody: true });
    res.render('article', {
      title: `${publicArticle.title} — The Daily Web`,
      metaDescription: publicArticle.summary,
      article: publicArticle,
      // the body is plain text; each line break becomes its own <p> in the view
      paragraphs: (publicArticle.body || '').split(/\n+/).map((p) => p.trim()).filter(Boolean),
      comments,
      myComments: req.session.myComments || [], // which comments this visitor may edit/delete
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/articles?page=&search=&category=&seen=&sort=  - json for the feed (infinite scroll etc)
async function list(req, res, next) {
  try {
    const { query, sort } = buildFeedQuery(req);
    const { limit, skip } = readPaging(req);

    const articles = await Article.find(query)
      .select(FEED_FIELDS)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('author', 'displayName')
      .lean();

    res.json(articles.map((a) => toPublicArticle(a)));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  renderHome,
  renderArticle,
  list,
};

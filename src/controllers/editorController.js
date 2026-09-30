// editor controll - this is the management side, editors can see and edit ALL articles
// no ownership check here, they're the boss basically
// status changes go thru specific endpoints (approve/return), not the general update

const Article = require('../models/Article');
const Comment = require('../models/Comment');
const View = require('../models/View');
const User = require('../models/User');
const { buildCategoryFilter, escapeRegex } = require('../utils/categories');

// the list is filtered + paged in the db, so it stays fast with thousands of articles
const PAGE_SIZE = 30;
// "status" sort puts what needs the editor's attention first
const STATUS_PRIORITY = ['pending', 'returned', 'draft', 'published'];
const SORTS = {
  updated: { updatedAt: -1, _id: -1 },
  oldest: { updatedAt: 1, _id: 1 },
  views: { viewsCount: -1, _id: -1 },
  genre: { category: 1, updatedAt: -1, _id: -1 },
  status: { statusRank: 1, updatedAt: -1, _id: -1 },
};

function sortKeyFrom(value) {
  if (['views', 'clicks', 'popular'].includes(value)) return 'views';
  if (['genre', 'category'].includes(value)) return 'genre';
  if (['status', 'oldest'].includes(value)) return value;
  return 'updated';
}

// search matches the headline, the summary or the reporter's name
async function buildFilter({ status, genre, search }) {
  const filter = {};
  if (Article.STATES.includes(status)) filter.status = status;
  const catFilter = buildCategoryFilter(genre);
  if (catFilter) filter.category = catFilter;
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    const authors = await User.find({ displayName: rx }).select('_id').lean();
    filter.$or = [{ title: rx }, { summary: rx }, { author: { $in: authors.map((a) => a._id) } }];
  }
  return filter;
}

function notFound(res) {
  return res.status(404).render('error', { status: 404, message: 'Article not found' });
}

// the approved copy readers see = the current working copy
function publishWorkingCopy(article) {
  article.published = {
    title: article.title,
    summary: article.summary,
    body: article.body,
    category: article.category,
    image: article.image,
  };
}

// GET /editor  - the dashboard.  with ?partial=1 (from editor-dashboard.js) only the matching
// rows are rendered, so filtering/sorting/"load more" update the list without a page reload
async function dashboard(req, res, next) {
  try {
    const current = {
      sort: sortKeyFrom(req.query.sort),
      status: Article.STATES.includes(req.query.status) ? req.query.status : 'all',
      genre: (req.query.genre || req.query.category || '').trim() || 'all',
      search: (req.query.search || '').trim(),
    };
    const partial = req.query.partial === '1';
    const page = partial ? Math.max(1, parseInt(req.query.page, 10) || 1) : 1;
    const filter = await buildFilter(current);

    const pipeline = [{ $match: filter }];
    if (current.sort === 'status') {
      pipeline.push({ $addFields: { statusRank: { $indexOfArray: [STATUS_PRIORITY, '$status'] } } });
    }
    pipeline.push(
      { $sort: SORTS[current.sort] },
      { $skip: (page - 1) * PAGE_SIZE },
      { $limit: PAGE_SIZE + 1 }, // one extra row tells us if there is a next page
      { $project: { body: 0, 'published.body': 0 } },
      // join the reporter's name (and nothing else from the user doc - no password hash)
      {
        $lookup: {
          from: 'users',
          let: { authorId: '$author' },
          pipeline: [{ $match: { $expr: { $eq: ['$_id', '$$authorId'] } } }, { $project: { displayName: 1 } }],
          as: 'author',
        },
      },
      { $set: { author: { $arrayElemAt: ['$author', 0] } } },
    );

    const [rows, matching] = await Promise.all([Article.aggregate(pipeline), Article.countDocuments(filter)]);
    const hasMore = rows.length > PAGE_SIZE;
    const articles = rows.slice(0, PAGE_SIZE);

    if (partial) {
      res.set('X-Has-More', hasMore ? '1' : '0');
      res.set('X-Total-Count', String(matching));
      return res.render('editor/_rows', { articles });
    }

    // counters for the KPI cards across the whole site
    const [total, statusAgg, viewsAgg, genreAgg] = await Promise.all([
      Article.countDocuments(),
      Article.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Article.aggregate([{ $group: { _id: null, totalClicks: { $sum: '$viewsCount' } } }]),
      Article.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    ]);

    const stats = { total, published: 0, pending: 0, returned: 0, draft: 0 };
    statusAgg.forEach((item) => {
      if (item._id in stats) stats[item._id] = item.count;
    });
    stats.totalClicks = viewsAgg[0] ? viewsAgg[0].totalClicks : 0;
    stats.genres = genreAgg.filter((g) => g._id).map((g) => ({ name: g._id, count: g.count }));

    res.render('editor/dashboard', {
      articles,
      stats,
      hasMore,
      matching,
      currentSort: current.sort,
      currentStatus: current.status,
      currentGenre: current.genre,
      currentSearch: current.search,
    });
  } catch (err) {
    next(err);
  }
}

// shows one article for the editor to look at
// if it's a pending update of a live article, the view shows both versions side by side
async function review(req, res, next) {
  try {
    const article = await Article.findById(req.params.id).populate('author', 'displayName');
    if (!article) return notFound(res);
    res.render('editor/review', { article, error: null });
  } catch (err) {
    next(err);
  }
}

// editor can fix typos etc, but cant change status from here
async function update(req, res, next) {
  try {
    const article = await Article.findById(req.params.id).populate('author', 'displayName');
    if (!article) return notFound(res);

    for (const field of Article.CONTENT_FIELDS) {
      if (typeof req.body[field] === 'string') article[field] = req.body[field];
    }

    // if the article is already live, an editor's edit goes straight to readers -
    // the editor is the authority, so no re-approval needed for their own change.
    // (drafts / pending / returned just save the content, status unchanged)
    if (article.status === 'published') {
      const missing = article.missingFields();
      if (missing.length) {
        return res.status(400).render('editor/review', { article, error: `A live article can't have an empty ${missing.join(', ')}.` });
      }
      if (article.hasUnpublishedChanges()) {
        publishWorkingCopy(article);
        article.updates.push(new Date()); // mark it on the analytics graph
      }
    }

    await article.save();
    res.redirect(`/editor/articles/${article._id}`);
  } catch (err) {
    next(err);
  }
}

// approve and publish - copies the working copy into `published`
async function approve(req, res, next) {
  try {
    const article = await Article.findById(req.params.id).populate('author', 'displayName');
    if (!article) return notFound(res);

    if (article.status !== 'pending') {
      return res.status(400).render('error', { status: 400, message: 'Only articles waiting for approval can be approved.' });
    }
    const missing = article.missingFields();
    if (missing.length) {
      return res.status(400).render('editor/review', { article, error: `Can't publish without a ${missing.join(', ')}.` });
    }

    publishWorkingCopy(article);
    article.status = 'published';
    article.editorNote = ''; // wipe old notes

    const now = new Date();
    if (article.publishedAt) {
      // it was already live, so this is an UPDATE - mark the moment for the analytics chart.
      // publishedAt stays the original date so an update doesn't pretend to be a new story in the feed
      article.updates.push(now);
    } else {
      article.publishedAt = now; // first publication
    }

    await article.save();
    res.redirect('/editor');
  } catch (err) {
    next(err);
  }
}

// sends it back to the reporter with a note explaining whats wrong
async function returnForFixes(req, res, next) {
  try {
    const article = await Article.findById(req.params.id).populate('author', 'displayName');
    if (!article) return notFound(res);

    if (article.status !== 'pending') {
      return res.status(400).render('error', { status: 400, message: 'Only articles waiting for approval can be returned.' });
    }
    const note = (req.body.editorNote || '').trim().slice(0, 1000);
    if (!note) {
      return res.status(400).render('editor/review', { article, error: 'Write a note telling the reporter what needs fixing.' });
    }

    article.status = 'returned';
    article.editorNote = note;
    await article.save();
    res.redirect('/editor');
  } catch (err) {
    next(err);
  }
}

// deletes the article completely, together with its comments and view stats
async function remove(req, res, next) {
  try {
    const article = await Article.findByIdAndDelete(req.params.id);
    if (!article) return notFound(res);
    await Promise.all([
      Comment.deleteMany({ article: article._id }),
      View.deleteMany({ article: article._id }),
    ]);
    res.redirect('/editor');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  dashboard,
  review,
  update,
  approve,
  returnForFixes,
  remove,
};

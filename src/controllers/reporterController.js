// reporter stuff - this file handles everything the reporter can do.
// it's their personal workspace: every query filters by author = the logged in user, so changing
// an id in the url just gives a 404 - you can't open, edit or submit someone else's article.
// the status only changes through submit(), never through edit/autosave.

const Article = require('../models/Article');

// a reporter can edit a draft, a returned article, or a live one (the edit stays private until approved).
// a pending article is being reviewed, so it's locked - enforced HERE, not only greyed out in the page.
const EDITABLE = ['draft', 'returned', 'published'];
const LOCKED_MESSAGE = 'This article is waiting for editor review, so it is locked until the editor responds.';

function findOwn(req) {
  return Article.findOne({ _id: req.params.id, author: req.session.user.id });
}

// copy only the content fields from the request - status, author, published etc can't be sneaked in
function applyContent(article, body) {
  for (const field of Article.CONTENT_FIELDS) {
    if (typeof body[field] === 'string') article[field] = body[field];
  }
}

function notFound(res) {
  return res.status(404).render('error', { status: 404, message: 'Article not found' });
}

// GET /reporter - my articles, newest activity first
async function dashboard(req, res, next) {
  try {
    const docs = await Article.find({ author: req.session.user.id }).sort({ updatedAt: -1 });
    const articles = docs.map((a) => ({
      ...a.toObject(),
      isLive: Boolean(a.publishedAt),
      hasUnpublishedChanges: Boolean(a.publishedAt) && a.hasUnpublishedChanges(),
    }));
    res.render('reporter/dashboard', { articles });
  } catch (err) {
    next(err);
  }
}

// GET /reporter/new - empty form. the article is created on the server with the first autosave
function newArticleForm(req, res) {
  res.render('reporter/edit', { article: new Article(), isNew: true, error: null });
}

// POST /reporter/articles - create a draft (from autosave -> json, or a plain form -> redirect)
async function create(req, res, next) {
  try {
    const article = new Article({ author: req.session.user.id, status: 'draft' });
    applyContent(article, req.body);
    await article.save();
    if (req.is('json')) return res.status(201).json({ id: article._id, savedAt: article.updatedAt });
    res.redirect(`/reporter/articles/${article._id}/edit`);
  } catch (err) {
    next(err);
  }
}

// GET /reporter/articles/:id/edit - always loads the latest saved version from the db
async function editForm(req, res, next) {
  try {
    const article = await findOwn(req);
    if (!article) return notFound(res);
    res.render('reporter/edit', { article, isNew: false, error: null });
  } catch (err) {
    next(err);
  }
}

// PUT /reporter/articles/:id - regular form save (autosave below is what the page normally uses)
async function update(req, res, next) {
  try {
    const article = await findOwn(req);
    if (!article) return notFound(res);
    if (!EDITABLE.includes(article.status)) {
      return res.status(409).render('error', { status: 409, message: LOCKED_MESSAGE });
    }
    applyContent(article, req.body);
    await article.save();
    res.redirect(`/reporter/articles/${article._id}/edit`);
  } catch (err) {
    next(err);
  }
}

// PATCH /reporter/articles/:id/autosave - called by public/js/editor.js ~1s after typing stops
async function autosave(req, res, next) {
  try {
    const article = await findOwn(req);
    if (!article) return res.status(404).json({ error: 'Article not found' });
    if (!EDITABLE.includes(article.status)) return res.status(409).json({ error: LOCKED_MESSAGE });
    applyContent(article, req.body);
    await article.save(); // a validation error (e.g. title too long) becomes a 400 json in errorHandler
    res.json({ savedAt: article.updatedAt });
  } catch (err) {
    next(err);
  }
}

// POST /reporter/articles/:id/submit - draft / returned / edited live article -> pending.
// a reporter can never publish; only the editor moves pending -> published or returned.
async function submit(req, res, next) {
  try {
    const article = await findOwn(req);
    if (!article) return notFound(res);
    if (!EDITABLE.includes(article.status)) {
      return res.status(409).render('error', { status: 409, message: 'This article is already waiting for review.' });
    }

    const missing = article.missingFields();
    if (missing.length) {
      return res.status(400).render('reporter/edit', {
        article, isNew: false,
        error: `Please fill in the ${missing.join(', ')} before submitting for review.`,
      });
    }
    if (article.publishedAt && !article.hasUnpublishedChanges()) {
      return res.status(400).render('reporter/edit', {
        article, isNew: false,
        error: 'Nothing has changed since the published version, so there is nothing to review.',
      });
    }

    article.status = 'pending';
    await article.save();
    res.redirect('/reporter');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  dashboard,
  newArticleForm,
  create,
  editForm,
  update,
  submit,
  autosave,
};

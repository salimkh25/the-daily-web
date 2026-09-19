// src/controllers/reporterController.js — [TODO — you build this]
//
// The reporter's workspace. Every handler here runs behind requireRole('reporter') and must
// enforce OWNERSHIP: a reporter can only see/edit their own articles (compare article.author
// to req.session.user.id on the server — never rely on the client).
//
//   dashboard(req, res, next)      GET  /reporter          -> list the reporter's own articles
//                                                             grouped/filtered by status.
//   newArticleForm(req, res)       GET  /reporter/new      -> render the create form.
//   create(req, res, next)         POST /reporter/articles -> create in status 'draft'.
//   editForm(req, res, next)       GET  /reporter/articles/:id/edit  -> only if owned.
//   update(req, res, next)         PUT  /reporter/articles/:id       -> save edits (only if owned
//                                                                       and in an editable state).
//   submit(req, res, next)         POST /reporter/articles/:id/submit-> 'draft'|'returned' -> 'pending'.
//
// WORKFLOW rules you must enforce on the server (see spec):
//   - new article starts as 'draft'
//   - reporter may move their article 'draft' -> 'pending' (submit for approval)
//   - reporter may edit a 'returned' article and resubmit it to 'pending'
//   - reporter may edit a 'published' article -> the edit goes through the SAME approval flow,
//     while the public keeps seeing the last approved version (see Article model notes)
//   - any other transition is NOT allowed -> reject with a clear error
//
// AUTO-SAVE / work continuity (spec): the reporter's work is saved continuously with no "Save"
// button, and survives closing the browser / refreshing / switching computers. That means the
// draft lives in the DB (not just the browser). Plan an endpoint the editor form calls on a
// debounce (e.g. PATCH /reporter/articles/:id/autosave) that upserts the current draft.

const Article = require('../models/Article');

async function dashboard(req, res, next) {
  try {
    const articles = await Article.find({ author: req.session.user.id })
                                  .sort({ updatedAt: -1 });
    res.render('reporter/dashboard', { articles });
  } catch (err) {
    next(err);
  }
}

function newArticleForm(req, res) {
  res.render('reporter/edit', { article: new Article(), mode: 'create' });
}

async function create(req, res, next) {
  try {
    // Whitelist: only accept editable fields from the form. NEVER take status/author/published
    // from req.body — a reporter must not be able to publish their own article.
    const { title, summary, body, category, image } = req.body;
    const article = new Article({
      title, summary, body, category, image,
      author: req.session.user.id,
      status: 'draft'
    });
    await article.save();
    res.redirect(`/reporter/articles/${article._id}/edit`);
  } catch (err) {
    next(err);
  }
}

async function editForm(req, res, next) {
  try {
    const article = await Article.findOne({ _id: req.params.id, author: req.session.user.id });
    if (!article) return res.status(404).send('Article not found or access denied.');
    res.render('reporter/edit', { article, mode: 'edit' });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const article = await Article.findOne({ _id: req.params.id, author: req.session.user.id });
    if (!article) return res.status(404).send('Not found');

    // Whitelist the editable fields — never let the body change status/author/published.
    const editable = ['title', 'summary', 'body', 'category', 'image'];
    for (const field of editable) {
      if (req.body[field] !== undefined) article[field] = req.body[field];
    }
    await article.save();
    res.redirect('/reporter');
  } catch (err) {
    next(err);
  }
}

async function submit(req, res, next) {
  try {
    const article = await Article.findOne({ _id: req.params.id, author: req.session.user.id });
    if (!article) return res.status(404).send('Not found');
    
    if (article.status === 'draft' || article.status === 'returned' || article.status === 'published') {
      article.status = article.status === 'published' ? 'published' : 'pending';
      // If it's already published, the draft fields are pending, but the overarching status might technically be 'pending' for the draft.
      // Wait, the spec says "reporter may edit a published article -> the edit goes through the SAME approval flow, while the public keeps seeing the last approved version". 
      // This means the main document status becomes `pending`, but `article.published` remains intact.
      article.status = 'pending';
      await article.save();
      res.redirect('/reporter');
    } else {
      res.status(400).send('Invalid transition');
    }
  } catch (err) {
    next(err);
  }
}

async function autosave(req, res, next) {
  try {
    const article = await Article.findOne({ _id: req.params.id, author: req.session.user.id });
    if (!article) return res.status(404).json({ error: 'Not found' });
    
    article.title = req.body.title || article.title;
    article.summary = req.body.summary || article.summary;
    article.body = req.body.body || article.body;
    article.category = req.body.category || article.category;
    article.image = req.body.image || article.image;
    
    await article.save();
    res.json({ success: true, timestamp: new Date() });
  } catch (err) {
    res.status(500).json({ error: err.message });
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

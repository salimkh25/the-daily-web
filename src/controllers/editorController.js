// src/controllers/editorController.js — [TODO — you build this]
//
// The editor's management area. Runs behind requireRole('editor'). An editor can see and act
// on EVERY article in the system.
//
//   dashboard(req, res, next)   GET  /editor                      -> all articles, filterable by status.
//   review(req, res, next)      GET  /editor/articles/:id         -> view submitted content; when it's
//                                                                    an edit to a published article, show
//                                                                    BOTH the current public version and
//                                                                    the pending new version.
//   update(req, res, next)      PUT  /editor/articles/:id         -> editor edits the article themselves.
//   approve(req, res, next)     POST /editor/articles/:id/approve -> 'pending' -> 'published'; the new
//                                                                    content becomes the public version;
//                                                                    record a publish/update marker for
//                                                                    the Impact Analytics graph.
//   returnForFixes(req,res,next)POST /editor/articles/:id/return  -> 'pending' -> 'returned' WITH a note
//                                                                    (req.body.editorNote is required).
//   remove(req, res, next)      DELETE /editor/articles/:id       -> delete an article.
//
// Enforce the allowed transitions on the server, same as the reporter side. Any illegal
// transition returns a clear error rather than silently doing nothing.

const Article = require('../models/Article');
const { recordView } = require('./statsController');

async function dashboard(req, res, next) {
  try {
    const articles = await Article.find({}).sort({ updatedAt: -1 }).populate('author', 'displayName username');
    res.render('editor/dashboard', { articles });
  } catch (err) {
    next(err);
  }
}

async function review(req, res, next) {
  try {
    const article = await Article.findById(req.params.id).populate('author', 'displayName');
    if (!article) return res.status(404).send('Not found');
    res.render('editor/review', { article });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).send('Not found');
    
    Object.assign(article, req.body);
    await article.save();
    res.redirect(`/editor/articles/${article._id}`);
  } catch (err) {
    next(err);
  }
}

async function approve(req, res, next) {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).send('Not found');
    
    if (article.status !== 'pending') return res.status(400).send('Only pending articles can be approved');

    // Move draft data to published subdocument
    article.published = {
      title: article.title,
      summary: article.summary,
      content: article.content,
      category: article.category,
      image: article.image
    };
    
    article.status = 'published';
    article.publishedAt = new Date();
    article.editorNote = ''; // clear any existing return notes
    
    // Log for Impact Analytics graph (publishing/updating)
    article.updates = article.updates || [];
    article.updates.push(new Date());

    await article.save();
    res.redirect('/editor');
  } catch (err) {
    next(err);
  }
}

async function returnForFixes(req, res, next) {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).send('Not found');
    
    if (article.status !== 'pending') return res.status(400).send('Only pending articles can be returned');

    article.status = 'returned';
    article.editorNote = req.body.editorNote || 'Please review and fix.';
    await article.save();
    
    res.redirect('/editor');
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await Article.findByIdAndDelete(req.params.id);
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

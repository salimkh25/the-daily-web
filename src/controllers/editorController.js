// editor controll - this is the management side, editors can see ALL articles
// no ownership check here, they're the boss basically
// status changes go thru specific endpoints (approve/return), not the general update

const Article = require('../models/Article');

// pulls every article in the system, sorted by recent changes
async function dashboard(req, res, next) {
  try {
    const articles = await Article.find({}).sort({ updatedAt: -1 }).populate('author', 'displayName username');
    res.render('editor/dashboard', { articles });
  } catch (err) {
    next(err);
  }
}

// shows one article for the editor to look at
// if the article was already published before, we show both versions side by side
async function review(req, res, next) {
  try {
    const article = await Article.findById(req.params.id).populate('author', 'displayName');
    if (!article) return res.status(404).send('Not found');
    res.render('editor/review', { article });
  } catch (err) {
    next(err);
  }
}

// editor can fix typos etc, but cant change status from here
async function update(req, res, next) {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).send('Not found');

    const editable = ['title', 'summary', 'body', 'category', 'image'];
    for (const field of editable) {
      if (req.body[field] !== undefined) article[field] = req.body[field];
    }
    await article.save();
    res.redirect(`/editor/articles/${article._id}`);
  } catch (err) {
    next(err);
  }
}

// approve and publish - copies the draft into the published subdoc
// also saves a timestamp so the analytics graph can mark when this update happened
async function approve(req, res, next) {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).send('Not found');

    if (article.status !== 'pending') return res.status(400).send('Only pending articles can be approved');

    // snapshot the current draft into published
    article.published = {
      title: article.title,
      summary: article.summary,
      body: article.body,
      category: article.category,
      image: article.image
    };

    article.status = 'published';
    article.publishedAt = new Date();
    article.editorNote = ''; // wipe old notes

    // push a timestamp for the analytics chart to show when this update went live
    article.updates = article.updates || [];
    article.updates.push(new Date());

    await article.save();
    res.redirect('/editor');
  } catch (err) {
    next(err);
  }
}

// sends it back to the reporter with a note explaining whats wrong
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

// nukes the article completely
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

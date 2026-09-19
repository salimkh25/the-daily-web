// reporter stuff - this file handles everything the reporter can do
// basically its like their personal workspace, they can only see their own articles
// we double check ownership on every req bc you cant trust the client lol

const Article = require('../models/Article');

// just shows the reporter their own stuff sorted by latest
async function dashboard(req, res, next) {
  try {
    const articles = await Article.find({ author: req.session.user.id })
                                  .sort({ updatedAt: -1 });
    res.render('reporter/dashboard', { articles });
  } catch (err) {
    next(err);
  }
}

// blank form for a new article
function newArticleForm(req, res) {
  res.render('reporter/edit', { article: new Article(), mode: 'create' });
}

async function create(req, res, next) {
  try {
    // only take what we need from the form, dont let them sneak in status or author
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

// load the edit form, but only if u actually own this article
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

    // manually update only the content fields, status changes are not allowed here
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

// reporter clicks "submit for review" - moves the article to pending
// if its already published, we still set it to pending so the editor reviews the new version
// the public keeps seeing the old published version until the editor approves
async function submit(req, res, next) {
  try {
    const article = await Article.findOne({ _id: req.params.id, author: req.session.user.id });
    if (!article) return res.status(404).send('Not found');

    if (article.status === 'draft' || article.status === 'returned' || article.status === 'published') {
      article.status = 'pending';
      await article.save();
      res.redirect('/reporter');
    } else {
      // cant submit something thats already pending
      res.status(400).send('Invalid transition');
    }
  } catch (err) {
    next(err);
  }
}

// this gets called every second or so while the reporter is typing
// saves the draft without changing the status - no save button needed
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

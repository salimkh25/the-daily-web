// src/routes/index.js — public pages (open to everyone).
//
// [SCAFFOLD] These render the skeleton views with PLACEHOLDER data so you can see the design
// the moment you start the server. As you build the real logic (GUIDE steps 5, 8), move these
// handlers into articleController (renderHome / renderArticle) and feed them real data from
// MongoDB. The commented lines show the wiring you'll switch to.
const router = require('express').Router();
// const articleController = require('../controllers/articleController');

// GET /  — the news feed home page.
// TODO: replace with `articleController.renderHome` (load published articles, page 1).
router.get('/', (req, res) => {
  res.render('home', {
    title: 'The Daily Web',
    hero: null, // TODO: your lead story
    articles: [], // TODO: first page of published articles
  });
});

// GET /article/:id — a single article page (server-rendered for SEO).
// TODO: replace with `articleController.renderArticle` (load the published article by id,
// its comments, and record a view). For now it renders a placeholder so the design is visible.
router.get('/article/:id', (req, res) => {
  res.render('article', {
    title: 'Article — The Daily Web',
    article: {
      _id: req.params.id,
      title: 'Your headline will appear here',
      category: 'Sample',
      author: { displayName: 'Staff Reporter' },
      publishedAt: new Date(),
      image: '',
      body: 'This is placeholder body text. Once you build the Article model and renderArticle, the real, server-rendered article content will appear here — visible to search engines without any JavaScript.',
    },
    comments: [], // server-rendered comments go here (empty state for now)
  });
});

module.exports = router;

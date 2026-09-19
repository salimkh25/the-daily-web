// src/routes/index.js — public pages (open to everyone).
//
// [SCAFFOLD] These render the skeleton views with PLACEHOLDER data so you can see the design
// the moment you start the server. As you build the real logic (GUIDE steps 5, 8), move these
// handlers into articleController (renderHome / renderArticle) and feed them real data from
// MongoDB. The commented lines show the wiring you'll switch to.
const router = require('express').Router();
const articleController = require('../controllers/articleController');

// GET /  — the news feed home page.
router.get('/', articleController.renderHome);

// GET /article/:id — a single article page (server-rendered for SEO).
router.get('/article/:id', articleController.renderArticle);

module.exports = router;

// public pages, open to everyone (the logic is in articleController)
const router = require('express').Router();
const articleController = require('../controllers/articleController');

// GET /  — the news feed home page.
router.get('/', articleController.renderHome);

// GET /article/:id — a single article page (server-rendered for SEO).
router.get('/article/:id', articleController.renderArticle);

module.exports = router;

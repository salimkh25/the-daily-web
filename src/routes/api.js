// src/routes/api.js — REST endpoints hit by client-side Ajax.
//
// The COMMENT routes below are the [WORKED EXAMPLE ✅] — study how a route wires middleware to
// a controller. The rest are [TODO] and left commented so the app still boots.
const router = require('express').Router();

const commentController = require('../controllers/commentController');
const createRateLimiter = require('../middleware/rateLimit');

// ---- Comments (WORKED) ----
// Guests can post at most 3 per minute — the limiter runs before the controller.
const commentLimiter = createRateLimiter({ windowMs: 60_000, max: 3 });

router.get('/articles/:articleId/comments', commentController.listByArticle);
router.post('/articles/:articleId/comments', commentLimiter, commentController.create);

// ---- Articles (TODO — GUIDE steps 5-7) ----
// const articleController = require('../controllers/articleController');
// router.get('/articles', articleController.list); // ?page= &search= &category= &sort= &seen=

// ---- Stats (TODO — GUIDE step 11) ----
// const statsController = require('../controllers/statsController');
// router.get('/articles/:id/stats', statsController.articleStats);

// ---- Weather (TODO — GUIDE step 12) ----
// router.get('/weather', weatherController.current);

module.exports = router;

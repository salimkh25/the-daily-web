// all the ajax/api endpoints in one place
// comments was the worked example we had to study, the rest we added ourselves

const router = require('express').Router();

const commentController = require('../controllers/commentController');
const createRateLimiter = require('../middleware/rateLimit');

// comments - limit guests to 3 per minute so people dont spam
const commentLimiter = createRateLimiter({ windowMs: 60_000, max: 3 });
router.get('/articles/:articleId/comments', commentController.listByArticle);
router.post('/articles/:articleId/comments', commentLimiter, commentController.create);
router.put('/comments/:id', commentController.update);    // commenter edits their own
router.delete('/comments/:id', commentController.remove); // commenter deletes own / editor deletes any

// article list endpoint - used by the feed for infinite scroll, search, filter etc
const articleController = require('../controllers/articleController');
router.get('/articles', articleController.list); // ?page= &search= &category= &sort= &seen=

// stats endpoint for the analytics chart
const statsController = require('../controllers/statsController');
router.get('/articles/:id/stats', statsController.articleStats);

// weather - proxied from server so the api key stays hidden
const weatherController = require('../controllers/weatherController');
router.get('/weather', weatherController.current);

module.exports = router;

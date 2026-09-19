// editor routes - same deal, everything locked behind requireRole('editor')
// editors can see everything, reporters cant get in here

const router = require('express').Router();
const { requireRole } = require('../middleware/auth');
const editorController = require('../controllers/editorController');
const statsController = require('../controllers/statsController');

router.use(requireRole('editor'));
router.get('/', editorController.dashboard);
router.get('/articles/:id', editorController.review);
router.put('/articles/:id', editorController.update);
router.post('/articles/:id/approve', editorController.approve);
router.post('/articles/:id/return', editorController.returnForFixes);
router.delete('/articles/:id', editorController.remove);
router.get('/articles/:id/stats', statsController.renderStatsPage); // the chart page

module.exports = router;

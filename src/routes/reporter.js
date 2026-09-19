// all reporter routes live here, everything is locked behind requireRole
// ownership is enforced inside each controller function too just to be safe

const router = require('express').Router();
const { requireRole } = require('../middleware/auth');
const reporterController = require('../controllers/reporterController');

router.use(requireRole('reporter'));
router.get('/', reporterController.dashboard);
router.get('/new', reporterController.newArticleForm);
router.post('/articles', reporterController.create);
router.get('/articles/:id/edit', reporterController.editForm);
router.put('/articles/:id', reporterController.update);
router.patch('/articles/:id/autosave', reporterController.autosave); // called by editor.js on debounce
router.post('/articles/:id/submit', reporterController.submit);

module.exports = router;

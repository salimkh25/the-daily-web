// src/routes/reporter.js — [TODO — GUIDE step 9]  reporter workspace
// Everything here must run behind requireRole('reporter') and enforce article ownership.
const router = require('express').Router();
const { requireRole } = require('../middleware/auth');
const reporterController = require('../controllers/reporterController');

router.use(requireRole('reporter'));
router.get('/', reporterController.dashboard);
router.get('/new', reporterController.newArticleForm);
router.post('/articles', reporterController.create);
router.get('/articles/:id/edit', reporterController.editForm);
router.put('/articles/:id', reporterController.update);
router.patch('/articles/:id/autosave', reporterController.autosave);
router.post('/articles/:id/submit', reporterController.submit);

module.exports = router;

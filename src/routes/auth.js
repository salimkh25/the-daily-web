// login / logout for reporters and editors
const router = require('express').Router();
const authController = require('../controllers/authController');

router.get('/login', authController.renderLogin);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

module.exports = router;

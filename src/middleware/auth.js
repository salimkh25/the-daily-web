// permission gates - these run on the SERVER for every request.
// hiding a button in the browser isnt security, anyone can send the request by hand,
// so every reporter/editor route and api goes through one of these.
//
// the logged in user lives in req.session.user = { id, role, displayName } (set in authController).
// the role comes from the db at login and is stored server side, the browser can't change it.
const { wantsJson } = require('./errorHandler');

function requireLogin(req, res, next) {
  if (req.session && req.session.user) return next();
  if (wantsJson(req)) return res.status(401).json({ error: 'Login required' });
  return res.redirect('/auth/login');
}

// usage: router.use(requireRole('editor'))  or  requireRole('reporter', 'editor')
function requireRole(...roles) {
  return (req, res, next) => {
    const user = req.session && req.session.user;
    if (!user) {
      if (wantsJson(req)) return res.status(401).json({ error: 'Login required' });
      return res.redirect('/auth/login');
    }
    if (!roles.includes(user.role)) {
      if (wantsJson(req)) return res.status(403).json({ error: 'Forbidden' });
      return res.status(403).render('error', { status: 403, message: 'You do not have permission to view this page.' });
    }
    return next();
  };
}

module.exports = { requireLogin, requireRole };

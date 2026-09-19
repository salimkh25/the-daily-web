// src/middleware/auth.js — [TODO — you build this]
//
// Server-side permission gates. The spec is explicit: ALL permission checks happen on the
// server. Hiding buttons/screens on the client does NOT count as enforcing permissions.
//
// The logged-in user lives on `req.session.user` (you set it in authController on login).
// Build two middlewares:
//
//   requireLogin(req, res, next)
//       - if there is no req.session.user -> redirect to /auth/login (for pages)
//         or respond 401 (for /api requests). Otherwise next().
//
//   requireRole(...roles)  ->  returns a middleware
//       - ensures req.session.user.role is one of `roles`, else 403.
//       - e.g. router.use('/editor', requireRole('editor'))
//
// Remember the ownership rule too (a reporter may edit only their OWN articles). That check
// is per-article, so it usually lives in the controller (compare article.author to the
// session user id), not here — but you can add a helper if you prefer.
//
// Skeleton:
//
// function requireLogin(req, res, next) {
//   if (req.session && req.session.user) return next();
//   if (req.originalUrl.startsWith('/api')) return res.status(401).json({ error: 'Login required' });
//   return res.redirect('/auth/login');
// }
//
// function requireRole(...roles) {
//   return (req, res, next) => {
//     const user = req.session && req.session.user;
//     if (!user) return res.redirect('/auth/login');
//     if (!roles.includes(user.role)) return res.status(403).render('error', { status: 403, message: 'Forbidden' });
//     return next();
//   };
// }
//
// module.exports = { requireLogin, requireRole };

module.exports = {
  requireLogin: (req, res, next) => next(), // TODO: replace — currently a no-op!
  requireRole: () => (req, res, next) => next(), // TODO: replace — currently a no-op!
};

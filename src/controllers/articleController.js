// src/controllers/articleController.js — [TODO — you build this]
//
// Public + REST reading of articles. Copy the SHAPE from commentController.js
// (async, try/catch, next(err), server-side validation, right status codes).
//
// Handlers you'll need (names are suggestions):
//
//   renderHome(req, res, next)      GET /            -> render 'home' with the first page of
//                                                       PUBLISHED articles for server render + SEO.
//   renderArticle(req, res, next)   GET /article/:id -> load one PUBLISHED article, render 'article'
//                                                       with full body IN THE HTML (SEO requirement),
//                                                       plus its comments (server-rendered), then
//                                                       record a view (see View model / statsController).
//   list(req, res, next)            GET /api/articles-> JSON list for Ajax. MUST support:
//                                                         ?page= &limit=20   (infinite scroll)
//                                                         ?search=           (search by title — text index)
//                                                         ?category=
//                                                         ?seen= / unseen    (viewed / not-viewed filter)
//                                                         ?sort=date|popular
//                                                       Return only PUBLISHED articles here.
//
// CRUD for reporters/editors lives in reporterController.js and editorController.js so the
// permission boundaries stay obvious.
//
// Tips:
//   - Only ever expose `status: 'published'` articles on the public side.
//   - For the "viewed/not-viewed" filter, decide how you track what a guest has seen
//     (e.g. an array of ids in the session, or a cookie).
//   - Paginate with .skip()/.limit() or a cursor; add indexes so it stays fast at 500+ articles.

const notImplemented = (label) => (req, res) =>
  res.status(501).json({ error: `${label} not implemented yet — see GUIDE.md` });

module.exports = {
  renderHome: notImplemented('renderHome'),
  renderArticle: notImplemented('renderArticle'),
  list: notImplemented('article list'),
};

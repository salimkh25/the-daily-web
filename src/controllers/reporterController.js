// src/controllers/reporterController.js — [TODO — you build this]
//
// The reporter's workspace. Every handler here runs behind requireRole('reporter') and must
// enforce OWNERSHIP: a reporter can only see/edit their own articles (compare article.author
// to req.session.user.id on the server — never rely on the client).
//
//   dashboard(req, res, next)      GET  /reporter          -> list the reporter's own articles
//                                                             grouped/filtered by status.
//   newArticleForm(req, res)       GET  /reporter/new      -> render the create form.
//   create(req, res, next)         POST /reporter/articles -> create in status 'draft'.
//   editForm(req, res, next)       GET  /reporter/articles/:id/edit  -> only if owned.
//   update(req, res, next)         PUT  /reporter/articles/:id       -> save edits (only if owned
//                                                                       and in an editable state).
//   submit(req, res, next)         POST /reporter/articles/:id/submit-> 'draft'|'returned' -> 'pending'.
//
// WORKFLOW rules you must enforce on the server (see spec):
//   - new article starts as 'draft'
//   - reporter may move their article 'draft' -> 'pending' (submit for approval)
//   - reporter may edit a 'returned' article and resubmit it to 'pending'
//   - reporter may edit a 'published' article -> the edit goes through the SAME approval flow,
//     while the public keeps seeing the last approved version (see Article model notes)
//   - any other transition is NOT allowed -> reject with a clear error
//
// AUTO-SAVE / work continuity (spec): the reporter's work is saved continuously with no "Save"
// button, and survives closing the browser / refreshing / switching computers. That means the
// draft lives in the DB (not just the browser). Plan an endpoint the editor form calls on a
// debounce (e.g. PATCH /reporter/articles/:id/autosave) that upserts the current draft.

const notImplemented = (label) => (req, res) =>
  res.status(501).send(`${label} not implemented yet — see GUIDE.md`);

module.exports = {
  dashboard: notImplemented('reporter dashboard'),
  newArticleForm: notImplemented('newArticleForm'),
  create: notImplemented('reporter create'),
  editForm: notImplemented('reporter editForm'),
  update: notImplemented('reporter update'),
  submit: notImplemented('reporter submit'),
  autosave: notImplemented('reporter autosave'),
};

// src/controllers/editorController.js — [TODO — you build this]
//
// The editor's management area. Runs behind requireRole('editor'). An editor can see and act
// on EVERY article in the system.
//
//   dashboard(req, res, next)   GET  /editor                      -> all articles, filterable by status.
//   review(req, res, next)      GET  /editor/articles/:id         -> view submitted content; when it's
//                                                                    an edit to a published article, show
//                                                                    BOTH the current public version and
//                                                                    the pending new version.
//   update(req, res, next)      PUT  /editor/articles/:id         -> editor edits the article themselves.
//   approve(req, res, next)     POST /editor/articles/:id/approve -> 'pending' -> 'published'; the new
//                                                                    content becomes the public version;
//                                                                    record a publish/update marker for
//                                                                    the Impact Analytics graph.
//   returnForFixes(req,res,next)POST /editor/articles/:id/return  -> 'pending' -> 'returned' WITH a note
//                                                                    (req.body.editorNote is required).
//   remove(req, res, next)      DELETE /editor/articles/:id       -> delete an article.
//
// Enforce the allowed transitions on the server, same as the reporter side. Any illegal
// transition returns a clear error rather than silently doing nothing.

const notImplemented = (label) => (req, res) =>
  res.status(501).send(`${label} not implemented yet — see GUIDE.md`);

module.exports = {
  dashboard: notImplemented('editor dashboard'),
  review: notImplemented('editor review'),
  update: notImplemented('editor update'),
  approve: notImplemented('approve'),
  returnForFixes: notImplemented('returnForFixes'),
  remove: notImplemented('editor remove'),
};

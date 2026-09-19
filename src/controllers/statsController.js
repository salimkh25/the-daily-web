// src/controllers/statsController.js — [TODO — you build this]
//
// Powers the "Impact Analytics" area for editors.
//
//   recordView(articleId)             a helper you call from renderArticle each time an article
//                                     page is opened. Increments the right time-bucket (see View model).
//   articleStats(req, res, next)      GET /api/articles/:id/stats -> JSON for the chart:
//                                       { series: [{ t: <time>, views: <n> }, ...],
//                                         updates: [<publish timestamps>] }
//   renderStatsPage(req, res)         GET /editor/articles/:id/stats -> render 'editor/stats',
//                                     which draws the chart client-side (Chart.js or <canvas>).
//
// The chart must show views over time AND clearly mark each point where an editor published an
// update, so you can see how views changed before vs after an update.
//
// Scale note (spec): the site may serve thousands of readers. Aggregate views into time buckets
// rather than charting raw per-view rows. Do the bucketing at write time (increment a counter)
// or with a MongoDB aggregation pipeline at read time — decide and be able to justify it.

const notImplemented = (label) => (req, res) =>
  res.status(501).json({ error: `${label} not implemented yet — see GUIDE.md` });

module.exports = {
  // recordView is called internally, not as a route — implement it to accept an articleId.
  recordView: async (_articleId) => { /* TODO: increment view bucket */ },
  articleStats: notImplemented('articleStats'),
  renderStatsPage: (req, res) =>
    res.status(501).send('stats page not implemented yet — see GUIDE.md'),
};

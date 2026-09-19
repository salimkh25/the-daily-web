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

const View = require('../models/View');
const Article = require('../models/Article');

async function recordView(articleId) {
  try {
    const currentHour = new Date();
    currentHour.setMinutes(0, 0, 0); // truncate to hour

    await View.updateOne(
      { article: articleId, hour: currentHour },
      { $inc: { count: 1 } },
      { upsert: true }
    );
  } catch (err) {
    console.error('Error recording view:', err);
  }
}

async function articleStats(req, res, next) {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ error: 'Article not found' });

    const views = await View.find({ article: req.params.id }).sort({ hour: 1 });
    
    const series = views.map(v => ({
      t: v.hour,
      views: v.count
    }));

    res.json({
      series,
      updates: article.updates || []
    });
  } catch (err) {
    next(err);
  }
}

function renderStatsPage(req, res) {
  res.render('editor/stats', { articleId: req.params.id });
}

module.exports = {
  recordView,
  articleStats,
  renderStatsPage,
};

// analytics stuff for the editor dashboard
// we bucket views by hour so querying it later is fast
// instead of storing every single pageview as a row (would be huge), 
// we just increment a counter per hour per article

const View = require('../models/View');
const Article = require('../models/Article');

// called internally from articleController when someone opens an article
// we dont await it bc we dont wanna slow down the page load for the user
async function recordView(articleId) {
  try {
    const bucket = new Date();
    bucket.setMinutes(0, 0, 0); // round down to the hour

    await View.updateOne(
      { article: articleId, bucket },
      { $inc: { count: 1 } },
      { upsert: true } // create the bucket doc if it doesnt exist yet
    );
  } catch (err) {
    console.error('Error recording view:', err);
  }
}

// returns the time-series data for the chart
// series = views per hour, updates = timestamps when editor published changes
async function articleStats(req, res, next) {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ error: 'Article not found' });

    const views = await View.find({ article: req.params.id }).sort({ bucket: 1 });

    const series = views.map(v => ({
      t: v.bucket,
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

// just renders the stats page - the actual chart data is fetched by the client from the api above
function renderStatsPage(req, res) {
  res.render('editor/stats', { articleId: req.params.id });
}

module.exports = {
  recordView,
  articleStats,
  renderStatsPage,
};

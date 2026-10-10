// Impact Analytics - views of one article over time + the moments an editor published an update.
//
// views are stored as hourly counters (see models/View.js), so this reads at most a few hundred
// small documents per article no matter how many thousands of people read it.
// hours with no views have no document, so we fill them with 0 to get a continuous time axis.

const mongoose = require('mongoose');
const View = require('../models/View');
const Article = require('../models/Article');

const HOUR = 60 * 60 * 1000;
const MAX_HOURLY_POINTS = 24 * 14; // more than 2 weeks of data -> one point per day so the chart stays readable

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// GET /api/articles/:id/stats  (editor only)
// -> { title, publishedAt, interval: 'hour' | 'day', series: [{ t, views }], updates: [date] }
async function articleStats(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(404).json({ error: 'Article not found' });

    const article = await Article.findById(id).select('title published.title publishedAt updates').lean();
    if (!article) return res.status(404).json({ error: 'Article not found' });

    const buckets = await View.find({ article: id }).sort({ bucket: 1 }).lean();
    const updates = (article.updates || []).map((d) => new Date(d)).sort((a, b) => a - b);
    const result = {
      title: (article.published && article.published.title) || article.title,
      publishedAt: article.publishedAt,
      interval: 'hour',
      series: [],
      updates,
    };
    if (!buckets.length) return res.json(result);

    // the chart runs from the first views (or publication) to the last views (or last update)
    let start = buckets[0].bucket.getTime();
    let end = buckets[buckets.length - 1].bucket.getTime();
    if (article.publishedAt) start = Math.min(start, View.hourOf(article.publishedAt).getTime());
    if (updates.length) end = Math.max(end, View.hourOf(updates[updates.length - 1]).getTime());

    if ((end - start) / HOUR <= MAX_HOURLY_POINTS) {
      const perHour = new Map(buckets.map((b) => [b.bucket.getTime(), b.count]));
      for (let t = start; t <= end; t += HOUR) {
        result.series.push({ t: new Date(t), views: perHour.get(t) || 0 });
      }
    } else {
      result.interval = 'day';
      const perDay = new Map();
      for (const b of buckets) {
        const day = startOfDay(b.bucket).getTime();
        perDay.set(day, (perDay.get(day) || 0) + b.count);
      }
      for (let d = startOfDay(start); d.getTime() <= end; d.setDate(d.getDate() + 1)) {
        result.series.push({ t: new Date(d), views: perDay.get(d.getTime()) || 0 });
      }
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
}

// GET /editor/articles/:id/stats  - the page; the chart data comes from the api above
async function renderStatsPage(req, res, next) {
  try {
    const article = await Article.findById(req.params.id).select('title published.title publishedAt updates').lean();
    if (!article) return res.status(404).render('error', { status: 404, message: 'Article not found' });

    res.render('editor/stats', {
      article: {
        _id: article._id,
        title: (article.published && article.published.title) || article.title || 'Untitled',
        publishedAt: article.publishedAt,
        updateCount: (article.updates || []).length,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  articleStats,
  renderStatsPage,
};

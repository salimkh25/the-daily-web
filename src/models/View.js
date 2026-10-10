// view statistics for the Impact Analytics chart.
//
// the site can have thousands of readers at once, so we do NOT store one document per page view.
// instead there is one document per (article, hour) with a counter that we $inc.
// an article read 10,000 times in one hour is still just ONE small document, and the chart
// query only reads a few hundred docs max. the unique index makes the upsert safe.
const mongoose = require('mongoose');
const logger = require('../utils/logger');

const viewSchema = new mongoose.Schema({
  article: { type: mongoose.Schema.Types.ObjectId, ref: 'Article', required: true, index: true },
  bucket:  { type: Date, required: true },   // start of the hour these views belong to
  count:   { type: Number, default: 0 },
});
viewSchema.index({ article: 1, bucket: 1 }, { unique: true });

// round a date down to the start of its hour
function hourOf(date = new Date()) {
  const d = new Date(date);
  d.setMinutes(0, 0, 0);
  return d;
}

// count one view: bump this hour's bucket (created on first view) and the article's total.
// fire-and-forget - the reader shouldn't wait for stats, and a failed count is only logged.
viewSchema.statics.record = function (articleId) {
  const Article = mongoose.model('Article');
  this.updateOne({ article: articleId, bucket: hourOf() }, { $inc: { count: 1 } }, { upsert: true })
    .catch((err) => logger.error('view bucket increment failed:', err.message));
  Article.updateOne({ _id: articleId }, { $inc: { viewsCount: 1 } })
    .catch((err) => logger.error('viewsCount increment failed:', err.message));
};

module.exports = mongoose.model('View', viewSchema);
module.exports.hourOf = hourOf;

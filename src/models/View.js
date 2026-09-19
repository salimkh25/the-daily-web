// src/models/View.js — [TODO — you build this]
//
// Powers the "Impact Analytics" graph: views of an article over time, with the points where
// an editor approved/published an update clearly marked.
//
// The spec says the site may serve THOUSANDS of readers at once, so think hard about how you
// record views. Storing one document per single page-view (thousands per popular article) makes
// the graph query slow. A common, defensible design (be ready to explain your choice):
//
//   Option A — per-visit rows: { article, createdAt }. Simple; aggregate with a time-bucket
//              pipeline ($group by hour/day). Heaviest to store.
//   Option B — pre-bucketed counters: one document per (article, timeBucket) with a `count`
//              you $inc on each view. Far fewer documents, fast to chart. Recommended for scale.
//
// You ALSO need the "update published" markers for the graph. Options: a separate small
// collection of publish events, or a field on the Article. Whatever you choose, the stats
// controller must be able to return: a time series of view counts + the list of update timestamps.
//
const mongoose = require('mongoose');
const viewSchema = new mongoose.Schema({
  article: { type: mongoose.Schema.Types.ObjectId, ref: 'Article', required: true, index: true },
  bucket:  { type: Date, required: true },   // e.g. start of the hour (Option B)
  count:   { type: Number, default: 0 },
});
viewSchema.index({ article: 1, bucket: 1 }, { unique: true });
module.exports = mongoose.model('View', viewSchema);

// src/models/Article.js — [TODO — you build this]
//
// This is the heart of the system. Use Comment.js as your pattern.
//
// Requirements this model must support (from the spec):
//   - Basic fields shown on the feed: title, image, summary, category, author (reporter), publishedAt
//   - Full body content for the article page
//   - A WORKFLOW STATUS, one of exactly these states:
//       'draft'            (בהכנה — in preparation)
//       'pending'          (ממתינה לאישור עורך — awaiting editor approval)
//       'published'        (פורסמה)
//       'returned'         (הוחזרה לתיקונים — returned for corrections)
//   - editorNote: the note an editor leaves when returning an article for corrections
//   - author: ObjectId ref to User (the reporter who owns it)
//   - Popularity/views support for sorting by popularity (decide: store a counter here,
//     and/or derive from the View model — see View.js)
//
// IMPORTANT — "edit a published article" rule:
//   When a reporter edits an already-published article, the PUBLIC keeps seeing the last
//   approved version until an editor approves the new one. Think about how to model this.
//   Two common approaches (pick one and be able to explain it in the defense):
//     (a) keep `publishedContent` (live) separate from `draftContent` (pending edits), or
//     (b) keep a small version history array and a pointer to the currently-public version.
//
// Also required elsewhere: search on at least one central field (e.g. title) — add a text
// index here, e.g.  articleSchema.index({ title: 'text', summary: 'text' });
//
// Suggested starting skeleton (uncomment and complete):
//
// const mongoose = require('mongoose');
//
// const ARTICLE_STATES = ['draft', 'pending', 'published', 'returned'];
//
// const articleSchema = new mongoose.Schema({
//   title:      { type: String, required: true, trim: true, maxlength: 160 },
//   summary:    { type: String, trim: true, maxlength: 400 },
//   body:       { type: String, required: true },
//   image:      { type: String, trim: true }, // URL or /uploads path
//   category:   { type: String, required: true, index: true },
//   author:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
//   status:     { type: String, enum: ARTICLE_STATES, default: 'draft', index: true },
//   editorNote: { type: String, trim: true, default: '' },
//   publishedAt:{ type: Date },
//   // ...your fields for the published-vs-pending-edit rule and popularity...
// }, { timestamps: true });
//
// // module.exports = mongoose.model('Article', articleSchema);
// // module.exports.STATES = ARTICLE_STATES;

// Until you implement the schema above, this file exports null so the app still boots.
// Replace this line with your `mongoose.model(...)` export. (GUIDE.md step 2)
module.exports = null;

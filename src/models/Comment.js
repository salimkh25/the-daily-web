// src/models/Comment.js — [WORKED EXAMPLE ✅ fully implemented]
//
// This is your reference for how a Mongoose model should look. Study it, then build
// Article.js, User.js and View.js in the same style. Notice:
//   - a clear schema with types, `required`, `trim`, `maxlength` (server-side validation)
//   - a reference to another model via ObjectId + `ref`
//   - `timestamps` so we get createdAt/updatedAt for free
//   - an index on the field we query by most (articleId), for speed at scale
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    // Which article this comment belongs to.
    article: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Article',
      required: true,
      index: true,
    },
    // Guests type a display name (no account needed to comment).
    author: {
      type: String,
      required: [true, 'Please enter your name'],
      trim: true,
      maxlength: [60, 'Name is too long'],
    },
    body: {
      type: String,
      required: [true, 'Comment cannot be empty'],
      trim: true,
      maxlength: [1000, 'Comment is too long'],
    },
  },
  { timestamps: true } // adds createdAt + updatedAt
);

// Newest-first listing per article is our hot path — index it.
commentSchema.index({ article: 1, createdAt: -1 });

module.exports = mongoose.model('Comment', commentSchema);

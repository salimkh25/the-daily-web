// a reader's comment on an article. guests don't have accounts, they just type a display name.
// validation lives in the schema (required / trim / maxlength) so bad data never reaches the db,
// and the (article, createdAt) index keeps "newest comments of this article" fast at scale.
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

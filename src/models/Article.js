// the article - the heart of the system.
//
// workflow status, exactly one of:
//   draft (בהכנה) -> pending (ממתינה לאישור עורך) -> published (פורסמה)
//                                                 \-> returned (הוחזרה לתיקונים) -> pending again
//
// every article keeps TWO copies of its content:
//   - the top-level title/summary/body/image/category = the WORKING copy the reporter edits (autosaved)
//   - `published` = the last version an editor APPROVED. this is the only thing the public ever sees.
// so a reporter can edit a live article and send it for approval while readers keep getting the
// approved copy. when the editor approves, the working copy is copied into `published`.
//
// drafts can be incomplete (autosave stores whatever was typed so far), so the content fields are not
// `required` here - completeness is checked when the reporter submits for review (missingFields()).
const mongoose = require('mongoose');

const ARTICLE_STATES = ['draft', 'pending', 'published', 'returned'];
const CONTENT_FIELDS = ['title', 'summary', 'body', 'image', 'category'];
const REQUIRED_TO_SUBMIT = ['title', 'summary', 'body', 'category'];

const publishedSchema = new mongoose.Schema({
  title:      { type: String, trim: true, maxlength: 160 },
  summary:    { type: String, trim: true, maxlength: 400 },
  body:       { type: String },
  image:      { type: String, trim: true },
  category:   { type: String }
}, { _id: false });

const articleSchema = new mongoose.Schema({
  // working copy
  title:      { type: String, trim: true, maxlength: [160, 'Title is too long (max 160 characters)'], default: '' },
  summary:    { type: String, trim: true, maxlength: [400, 'Summary is too long (max 400 characters)'], default: '' },
  body:       { type: String, default: '' },
  image:      { type: String, trim: true, maxlength: [500, 'Image URL is too long'], default: '' },
  category:   { type: String, trim: true, maxlength: [40, 'Category is too long'], default: '', index: true },

  // metadata
  author:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status:     { type: String, enum: ARTICLE_STATES, default: 'draft', index: true },
  editorNote: { type: String, trim: true, default: '' },
  publishedAt:{ type: Date, index: true },           // first publication - stays the same on later updates
  viewsCount: { type: Number, default: 0, index: true },
  updates:    [{ type: Date }],                      // when an editor published an UPDATE - analytics markers

  // live version (copied from the working copy on approval)
  published:  { type: publishedSchema, default: {} }
}, { timestamps: true });

// text index for the public search - on the *published* content only
articleSchema.index({
  'published.title': 'text',
  'published.summary': 'text',
  'published.body': 'text'
});

// which required fields are still empty (checked before submitting for review)
articleSchema.methods.missingFields = function () {
  return REQUIRED_TO_SUBMIT.filter((field) => !(this[field] || '').trim());
};

// does the working copy differ from what readers see?
articleSchema.methods.hasUnpublishedChanges = function () {
  const live = this.published || {};
  return CONTENT_FIELDS.some((field) => (this[field] || '') !== (live[field] || ''));
};

module.exports = mongoose.model('Article', articleSchema);
module.exports.STATES = ARTICLE_STATES;
module.exports.CONTENT_FIELDS = CONTENT_FIELDS;

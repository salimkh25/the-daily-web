// src/controllers/commentController.js — [WORKED EXAMPLE ✅ fully implemented]
//
// Your reference for a REST controller. Notice the shape you'll reuse everywhere:
//   - each handler is `async (req, res, next)`
//   - all DB work is wrapped in try/catch; on error we call next(err) so the central
//     errorHandler deals with it and the server never crashes
//   - we validate input on the SERVER (never trust the client)
//   - we return JSON for Ajax endpoints, with the right HTTP status codes
const mongoose = require('mongoose');
const Comment = require('../models/Comment');

// GET /api/articles/:articleId/comments  -> list newest first
async function listByArticle(req, res, next) {
  try {
    const { articleId } = req.params;
    if (!mongoose.isValidObjectId(articleId)) {
      return res.status(400).json({ error: 'Invalid article id' });
    }
    const comments = await Comment.find({ article: articleId })
      .sort({ createdAt: -1 })
      .lean();
    res.json(comments);
  } catch (err) {
    next(err);
  }
}

// POST /api/articles/:articleId/comments  -> create one, return it
// (The 3-per-minute rate limit is applied by middleware BEFORE this runs — see routes/api.js.)
async function create(req, res, next) {
  try {
    const { articleId } = req.params;
    if (!mongoose.isValidObjectId(articleId)) {
      return res.status(400).json({ error: 'Invalid article id' });
    }

    // Server-side validation. The schema also validates, but checking here lets us return a
    // friendly 400 instead of letting a ValidationError bubble up.
    const author = (req.body.author || '').trim();
    const body = (req.body.body || '').trim();
    if (!author || !body) {
      return res.status(400).json({ error: 'Name and comment are both required.' });
    }

    const comment = await Comment.create({ article: articleId, author, body });

    // remember this comment in the guest's session so they can edit/delete it later
    req.session.myComments = req.session.myComments || [];
    req.session.myComments.push(comment._id.toString());

    res.status(201).json(comment); // client appends this without reloading the list
  } catch (err) {
    // Turn Mongoose validation errors into a clean 400.
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: Object.values(err.errors)[0].message });
    }
    next(err);
  }
}

// did the current guest session post this comment? (that's how we know it's "theirs")
function ownsComment(req, id) {
  return Array.isArray(req.session.myComments) && req.session.myComments.map(String).includes(String(id));
}

// PUT /api/comments/:id  -> the commenter edits their OWN comment
async function update(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid comment id' });
    if (!ownsComment(req, id)) return res.status(403).json({ error: 'You can only edit your own comment.' });

    const body = (req.body.body || '').trim();
    if (!body) return res.status(400).json({ error: 'Comment cannot be empty.' });

    const comment = await Comment.findByIdAndUpdate(id, { body }, { new: true, runValidators: true });
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    res.json(comment);
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ error: Object.values(err.errors)[0].message });
    next(err);
  }
}

// DELETE /api/comments/:id  -> the commenter deletes their own, OR an editor deletes any
async function remove(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid comment id' });

    const isEditor = req.session.user && req.session.user.role === 'editor';
    if (!ownsComment(req, id) && !isEditor) {
      return res.status(403).json({ error: 'You are not allowed to delete this comment.' });
    }

    const comment = await Comment.findByIdAndDelete(id);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    if (Array.isArray(req.session.myComments)) {
      req.session.myComments = req.session.myComments.filter((c) => String(c) !== String(id));
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { listByArticle, create, update, remove };

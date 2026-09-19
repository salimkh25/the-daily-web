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
    res.status(201).json(comment); // client appends this without reloading the list
  } catch (err) {
    // Turn Mongoose validation errors into a clean 400.
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: Object.values(err.errors)[0].message });
    }
    next(err);
  }
}

module.exports = { listByArticle, create };

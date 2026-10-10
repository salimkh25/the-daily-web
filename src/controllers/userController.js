// staff management (editor only) - full CRUD for the User model:
// list + search, create, update (name / role / new password), delete.
// passwords are never shown or stored in plain text - the User model hashes them on save.

const mongoose = require('mongoose');
const User = require('../models/User');
const Article = require('../models/Article');
const { escapeRegex } = require('../utils/categories');

const ROLES = ['reporter', 'editor'];
const USERNAME_RE = /^[a-z0-9._-]{3,30}$/;
const MIN_PASSWORD = 6;
const DONE_MESSAGES = {
  created: 'Staff member added.',
  updated: 'Changes saved.',
  deleted: 'Staff member removed.',
};

// GET /editor/users?search=   (also re-rendered with an error message when a form fails)
async function renderList(req, res, { status = 200, error = null } = {}) {
  const search = (req.query.search || '').trim();
  const filter = {};
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ username: rx }, { displayName: rx }];
  }

  const [users, counts] = await Promise.all([
    User.find(filter).sort({ role: 1, displayName: 1 }).lean(),
    Article.aggregate([{ $group: { _id: '$author', count: { $sum: 1 } } }]),
  ]);
  const articleCount = new Map(counts.map((c) => [String(c._id), c.count]));
  users.forEach((u) => { u.articleCount = articleCount.get(String(u._id)) || 0; });

  res.status(status).render('editor/users', {
    users,
    search,
    error,
    success: DONE_MESSAGES[req.query.done] || null,
    me: String(req.session.user.id),
  });
}

async function list(req, res, next) {
  try {
    await renderList(req, res);
  } catch (err) {
    next(err);
  }
}

// POST /editor/users
async function create(req, res, next) {
  try {
    const username = (req.body.username || '').trim().toLowerCase();
    const displayName = (req.body.displayName || '').trim();
    const role = req.body.role;
    const password = req.body.password || '';

    let error = null;
    if (!USERNAME_RE.test(username)) error = 'Username must be 3-30 characters: letters, numbers, dot, dash or underscore.';
    else if (!displayName || displayName.length > 60) error = 'Display name is required (max 60 characters).';
    else if (!ROLES.includes(role)) error = 'Pick a role: reporter or editor.';
    else if (password.length < MIN_PASSWORD) error = `Password must be at least ${MIN_PASSWORD} characters.`;
    else if (await User.exists({ username })) error = `The username "${username}" is already taken.`;
    if (error) return renderList(req, res, { status: 400, error });

    await User.create({ username, displayName, role, password }); // hashed in the model's pre-save hook
    res.redirect('/editor/users?done=created');
  } catch (err) {
    next(err);
  }
}

// PUT /editor/users/:id  - display name, role, and optionally a new password
async function update(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return renderList(req, res, { status: 404, error: 'User not found.' });
    const user = await User.findById(id);
    if (!user) return renderList(req, res, { status: 404, error: 'User not found.' });

    const isMe = String(user._id) === String(req.session.user.id);
    const displayName = (req.body.displayName || '').trim();
    const role = req.body.role;
    const password = req.body.password || '';

    let error = null;
    if (!displayName || displayName.length > 60) error = 'Display name is required (max 60 characters).';
    else if (!ROLES.includes(role)) error = 'Pick a role: reporter or editor.';
    else if (isMe && role !== user.role) error = "You can't change your own role (you'd lock yourself out of the editor area).";
    else if (password && password.length < MIN_PASSWORD) error = `A new password must be at least ${MIN_PASSWORD} characters.`;
    if (error) return renderList(req, res, { status: 400, error });

    user.displayName = displayName;
    user.role = role;
    if (password) user.password = password; // re-hashed on save
    await user.save();

    // keep the name in the header up to date if editors rename themselves
    if (isMe) req.session.user.displayName = displayName;
    res.redirect('/editor/users?done=updated');
  } catch (err) {
    next(err);
  }
}

// DELETE /editor/users/:id
async function remove(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return renderList(req, res, { status: 404, error: 'User not found.' });
    if (id === String(req.session.user.id)) {
      return renderList(req, res, { status: 400, error: "You can't delete your own account." });
    }
    // their articles would be left without an author - the editor has to deal with those first
    const owned = await Article.countDocuments({ author: id });
    if (owned > 0) {
      return renderList(req, res, { status: 400, error: `This person still has ${owned} article(s). Delete or keep them before removing the account.` });
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) return renderList(req, res, { status: 404, error: 'User not found.' });
    res.redirect('/editor/users?done=deleted');
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };

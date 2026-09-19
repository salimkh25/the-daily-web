// src/models/User.js — [TODO — you build this]
//
// Three roles exist in the system: Guest (no account), Reporter, Editor.
// Only reporters and editors have User documents and log in.
//
// Requirements this model must support:
//   - username (unique) + password
//   - PASSWORDS ARE HASHED, never stored as plain text and not reversible.
//       Use bcryptjs. Best practice: hash in a `pre('save')` hook when the password changed,
//       and add an instance method `comparePassword(plain)` that calls bcrypt.compare.
//   - role: 'reporter' | 'editor'  (drives server-side permission checks)
//   - displayName (shown as the article byline / "כתב")
//
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username:    { type: String, required: true, unique: true, trim: true, lowercase: true },
  password:    { type: String, required: true },       // stores the bcrypt HASH, not the password
  role:        { type: String, enum: ['reporter', 'editor'], required: true },
  displayName: { type: String, required: true, trim: true },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('User', userSchema);

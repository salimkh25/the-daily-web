// staff accounts. three roles exist in the system: guest (no account), reporter, editor -
// only reporters and editors have a User document and can log in.
//
// passwords are HASHED with bcrypt before saving (pre-save hook below). a hash can't be turned back
// into the password; at login we hash the typed password the same way and compare (comparePassword).
// `select: false` means the hash is never loaded unless a query asks for it explicitly (only login does).
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username:    {
    type: String, required: true, unique: true, trim: true, lowercase: true,
    minlength: 3, maxlength: 30, match: [/^[a-z0-9._-]+$/, 'Username may only use letters, numbers, dot, dash or underscore'],
  },
  password:    { type: String, required: true, select: false }, // the bcrypt HASH, never the password
  role:        { type: String, enum: ['reporter', 'editor'], required: true },
  displayName: { type: String, required: true, trim: true, maxlength: 60 }, // the byline on articles
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

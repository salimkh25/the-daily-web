// src/controllers/authController.js — [TODO — you build this]
//
// Login/logout for reporters and editors. Guests never log in.
//
//   renderLogin(req, res)     GET  /auth/login   -> render 'login'
//   login(req, res, next)     POST /auth/login   -> find user by username, verify password with
//                                                   user.comparePassword(...). On success set
//                                                   req.session.user = { id, role, displayName }
//                                                   and redirect: reporter -> /reporter, editor -> /editor.
//                                                   On failure re-render login with an error (never
//                                                   reveal whether it was the username or password).
//   logout(req, res)          POST /auth/logout  -> req.session.destroy(...) then redirect '/'.
//
// SECURITY reminders:
//   - Never store or compare plain-text passwords (bcrypt only — see User model).
//   - Put ONLY non-sensitive identity in the session (id, role, displayName). The role in the
//     session is the source of truth for permissions — never trust a role sent from the browser.

const User = require('../models/User');

function renderLogin(req, res) {
  res.render('login', { error: null });
}

async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    
    // Server-side validation
    if (!username || !password) {
      return res.render('login', { error: 'Invalid credentials' });
    }

    const user = await User.findOne({ username: username.trim().toLowerCase() });
    
    // Check user and password
    if (!user || !(await user.comparePassword(password))) {
      return res.render('login', { error: 'Invalid credentials' });
    }

    // Success! Regenerate the session first so the pre-login session id can't be
    // reused to hijack this logged-in session (prevents session fixation), then store
    // identity and persist it before redirecting.
    req.session.regenerate((regenErr) => {
      if (regenErr) return next(regenErr);

      req.session.user = {
        id: user._id,
        role: user.role,
        displayName: user.displayName
      };

      req.session.save((saveErr) => {
        if (saveErr) return next(saveErr);

        // Redirect based on role
        if (user.role === 'reporter') return res.redirect('/reporter');
        if (user.role === 'editor') return res.redirect('/editor');
        res.redirect('/'); // fallback
      });
    });
  } catch (err) {
    next(err);
  }
}

function logout(req, res, next) {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.redirect('/');
  });
}

module.exports = {
  renderLogin,
  login,
  logout,
};

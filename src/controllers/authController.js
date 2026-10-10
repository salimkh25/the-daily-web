// login / logout for reporters and editors (guests never log in).
//
// on login we store only { id, role, displayName } in the session. the session lives in mongodb
// (connect-mongo), so a server restart doesn't log anyone out, and the role in it comes from the db -
// the browser only holds a random session id cookie, it can't change its own role.
// the error message never says whether the username or the password was wrong.

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

    // the password hash is select:false in the model, so ask for it explicitly here
    const user = await User.findOne({ username: String(username).trim().toLowerCase() }).select('+password');
    
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

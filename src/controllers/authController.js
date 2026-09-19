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

const notImplemented = (label) => (req, res) =>
  res.status(501).send(`${label} not implemented yet — see GUIDE.md`);

module.exports = {
  renderLogin: notImplemented('renderLogin'),
  login: notImplemented('login'),
  logout: notImplemented('logout'),
};

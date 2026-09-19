// server.js — application entry point. [PLUMBING — written for you]
//
// Boots Express, wires the view engine, sessions, static files, routes and error handling,
// then connects to MongoDB and starts listening. You generally won't need to edit this much;
// you add features by filling in the routes/controllers/models it already mounts.
const path = require('path');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const connectDB = require('./config/db');
const logger = require('./src/utils/logger');
const { notFound, errorHandler } = require('./src/middleware/errorHandler');

// Route modules (each is an express.Router). Stubs for now — you fill them in.
const publicRoutes = require('./src/routes/index');
const apiRoutes = require('./src/routes/api');
const authRoutes = require('./src/routes/auth');
const reporterRoutes = require('./src/routes/reporter');
const editorRoutes = require('./src/routes/editor');

const app = express();
const PORT = process.env.PORT || 3000;

// --- View engine (EJS) ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- Body parsing (built into Express 4.16+) ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- Static assets (/css, /js, images) ---
app.use(express.static(path.join(__dirname, 'public')));

// --- Sessions (stored in MongoDB so logins survive a server restart — a spec requirement) ---
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7, httpOnly: true }, // 7 days
  })
);

// --- Make the logged-in user available to every EJS view as `currentUser` ---
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});

// --- Routes ---
app.use('/', publicRoutes); // home, article pages (public)
app.use('/api', apiRoutes); // REST endpoints (Ajax)
app.use('/auth', authRoutes); // login / logout
app.use('/reporter', reporterRoutes); // reporter workspace (auth required)
app.use('/editor', editorRoutes); // editor management area (auth required)

// --- 404 + central error handler (must be last) ---
app.use(notFound);
app.use(errorHandler);

// --- Start ---
(async () => {
  await connectDB();
  app.listen(PORT, () => logger.info(`The Daily Web running on http://localhost:${PORT}`));
})();

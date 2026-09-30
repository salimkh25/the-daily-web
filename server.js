// server.js - application entry point.
// sets up express (EJS views, body parsing, sessions stored in mongodb, static files), mounts the
// route modules and the error handlers, then connects to MongoDB and starts listening.
const path = require('path');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const methodOverride = require('method-override');

const connectDB = require('./config/db');
const logger = require('./src/utils/logger');
const { notFound, errorHandler } = require('./src/middleware/errorHandler');

// route modules (each one is an express.Router)
const publicRoutes = require('./src/routes/index');
const apiRoutes = require('./src/routes/api');
const authRoutes = require('./src/routes/auth');
const reporterRoutes = require('./src/routes/reporter');
const editorRoutes = require('./src/routes/editor');

const app = express();
const PORT = process.env.PORT || 3000;

// the list of site sections, available in every view (category dropdowns)
app.locals.CATEGORIES = require('./src/utils/categories').CATEGORIES;

// --- View engine (EJS) ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- Body parsing (built into Express 4.16+) ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- Method override (lets HTML forms send PUT/DELETE via ?_method=PUT) ---
app.use(methodOverride('_method'));

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

// --- Make the logged-in user, active category and search available to every EJS view ---
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.currentCategory = req.query.category || '';
  res.locals.currentSearch = req.query.search || '';
  res.locals.currentPath = req.path; // the nav only highlights "Home" on the home page
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

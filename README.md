# The Daily Web

A news management, editing and publishing platform — final project for **Web Applications Development** (summer semester). Built with the course stack only: **Node.js, Express, MongoDB/Mongoose, EJS, vanilla JavaScript**, following the **MVC** pattern.

> This repository is currently a **scaffold**: the plumbing and one worked feature (comments) are in place; the graded features are built step-by-step by the team following [`GUIDE.md`](GUIDE.md).

## Requirements

- Node.js 20.6+ (uses the built-in `--env-file` flag)
- MongoDB Community running locally (see setup)

## Setup & run

```bash
# 1. Install dependencies
npm install

# 2. Install & start MongoDB locally (macOS / Homebrew)
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# 3. Create your environment file and fill it in
cp .env.example .env
# then edit .env (set SESSION_SECRET, WEATHER_API_KEY, etc.)

# 4. (optional) load demo data — once seed/seed.js is implemented
npm run seed

# 5. Start the server
npm run dev      # auto-restarts on change
# or: npm start
```

Then open <http://localhost:3000>.

## Project structure

```
the-daily-web/
├── server.js              # Express app bootstrap (view engine, sessions, routes, errors)
├── config/db.js           # Mongoose connection
├── src/
│   ├── models/            # Mongoose schemas: User, Article, Comment, View
│   ├── controllers/       # Request handlers (one file per area)
│   ├── routes/            # Express routers: index (public), api, auth, reporter, editor
│   ├── middleware/        # auth (permissions), rateLimit (comments), errorHandler
│   └── utils/logger.js    # Simple file+console logger
├── views/                 # EJS templates + partials (header, footer, comments, weather)
├── public/                # Static assets — css/style.css, js/ (client-side Ajax)
├── seed/seed.js           # Demo-data generator (npm run seed)
├── design.md              # UI/UX design system
└── GUIDE.md               # Step-by-step build guide
```

## Core functionality (target)

- Public news feed: infinite scroll, search, filter (category / seen), sort (date / popularity) — all via Ajax
- Article pages: server-rendered for SEO, with an Ajax comments section (guest rate-limit 3/min)
- Roles: **Guest**, **Reporter**, **Editor** — hashed passwords, server-side permission checks, sessions that survive restart
- Reporter workspace: article workflow (draft → pending → published / returned) with continuous auto-save
- Editor area: review, edit, approve/publish, return-with-note, delete; current-vs-pending view for edits to published articles
- Impact Analytics: views-over-time chart marking each update-publish point
- Weather widget (OpenWeatherMap free tier), error handling, logging, responsive UI

## Tech / library note

Backend dependencies used: `express`, `mongoose`, `ejs`, `express-session`, `connect-mongo`, `bcryptjs`.
The spec forbids libraries **not taught in the course**. `express`, `mongoose` and `ejs` are core; **confirm with your lecturer** that `bcryptjs`, `express-session` and `connect-mongo` are acceptable before submission (they satisfy the "hashed passwords" and "sessions survive restart" requirements).

## Team & git workflow

See [`GUIDE.md`](GUIDE.md) for the branch-per-feature + pull-request workflow the team follows.

## Security

Never commit `.env`, passwords, API keys or tokens. `.env` is gitignored.

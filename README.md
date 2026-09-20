# The Daily Web

A news management, editing and publishing platform — final project for **Web Applications Development** (summer semester). Built with the course stack only: **Node.js, Express, MongoDB/Mongoose, EJS, vanilla JavaScript + Ajax**, following the **MVC** pattern.

## Requirements

- **Node.js 20.6+** (uses the built-in `--env-file` flag)
- **MongoDB Community** running locally

## Setup & run

```bash
# 1. Install dependencies
npm install

# 2. Install & start MongoDB locally (macOS / Homebrew)
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# 3. Create a .env file in the project root (see "Environment variables" below)

# 4. Load demo data (500+ articles, users, comments, view stats)
npm run seed

# 5. Start the server
npm run dev      # auto-restarts on change
# or: npm start
```

Then open <http://localhost:3000>.

### Environment variables

Create a **`.env`** file in the project root:

```
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/thedailyweb
SESSION_SECRET=change-me-to-a-long-random-string
WEATHER_API_KEY=your-free-openweathermap-key
WEATHER_CITY=Tel Aviv
WEATHER_UNITS=metric
```

`.env` is gitignored — never commit it. A free OpenWeatherMap key (no credit card) is at <https://openweathermap.org/api>.

### Demo logins (created by `npm run seed`)

| Role | Username | Password |
|------|----------|----------|
| Reporter | `salim` | `12345678` |
| Reporter | `reporter2` | `password` |
| Editor | `salom2` | `12345678` |

## Project structure

```
the-daily-web/
├── server.js              # Express app bootstrap (view engine, sessions, routes, errors)
├── config/db.js           # Mongoose connection
├── src/
│   ├── models/            # Mongoose schemas: User, Article, Comment, View
│   ├── controllers/       # Handlers: article, auth, reporter, editor, comment, stats, weather
│   ├── routes/            # Express routers: index (public), api, auth, reporter, editor
│   ├── middleware/        # auth (permissions), rateLimit (comments), errorHandler
│   └── utils/logger.js    # Simple file + console logger
├── views/                 # EJS templates + partials (header, footer, comments, weather)
├── public/                # Static assets — css/style.css, js/ (client-side Ajax)
├── seed/seed.js           # Demo-data generator (npm run seed)
└── design.md              # UI/UX design system
```

## Features

- **Public feed** — infinite scroll, search, filter by category and read/unread, sort by date or popularity; all via Ajax with no full page reload.
- **Article pages** — server-rendered for SEO. Ajax comments where a commenter can **edit or delete their own** comment and an **editor can delete any**; guests are limited to 3 comments per minute.
- **Roles** — Guest, Reporter, Editor. Passwords hashed with bcrypt; every permission check runs on the server; sessions survive a server restart.
- **Reporter workspace** — article workflow (draft → pending → published / returned) with continuous auto-save. Editing a published article keeps the last approved version public until an editor re-approves.
- **Editor desk** — dashboard with counts and filters; review/edit any article; approve & publish, return with a note, delete; current-vs-pending compare for edits to live articles.
- **Impact Analytics** — a views-over-time chart that marks each publish/update.
- **Weather widget** — OpenWeatherMap (free tier), proxied and cached server-side (≤15 min) so the API key never reaches the browser.
- Error handling and logging on client and server; responsive layout.

## Libraries

`express`, `mongoose`, `ejs`, `express-session`, `connect-mongo`, `bcryptjs`, `method-override`.

The spec allows only technologies taught in the course. `express`, `mongoose` and `ejs` are core; **confirm with the lecturer** that `bcryptjs`, `express-session`, `connect-mongo` and `method-override` are acceptable — they provide hashed passwords, restart-proof sessions, and form-based `PUT`/`DELETE`.

## Security

Never commit `.env`, passwords, API keys or tokens. `.env` is gitignored.

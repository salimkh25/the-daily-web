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

# 3. Create your .env from the example and fill in the values
cp .env.example .env

# 4. Load the demo data (520 articles, users, comments, view stats) — wipes the database first
npm run seed

# 5. Start the server
npm run dev      # auto-restarts on change
# or: npm start
```

Then open <http://localhost:3000>.

### Environment variables

| Variable | Meaning |
|---|---|
| `PORT` | HTTP port (default 3000) |
| `MONGODB_URI` | e.g. `mongodb://127.0.0.1:27017/thedailyweb` |
| `SESSION_SECRET` | any long random string |
| `WEATHER_API_KEY` | free OpenWeatherMap key (no credit card): <https://openweathermap.org/api> |
| `WEATHER_CITY` | city shown in the widget (unknown names fall back to Haifa) |
| `WEATHER_UNITS` | `metric` or `imperial` |
| `WEATHER_LAT`, `WEATHER_LON` | optional — look the place up by coordinates (for towns OpenWeatherMap doesn't know by name) |

`.env` is gitignored — never commit it.

### Demo logins (created by `npm run seed`)

| Role | Username | Password |
|------|----------|----------|
| Editor | `salom2` | `12345678` |
| Reporter | `salim` | `12345678` |
| Reporter | `reporter2` | `password` |
| Reporter | `reporter3` | `password` |
| Reporter | `reporter4` | `password` |

### Demo data

`npm run seed` generates everything itself (no external files): **520 original articles** about fictional places, companies and teams in 8 sections, with free photos from picsum.photos. It includes every state (published / pending / returned / draft), live articles with an edit waiting for approval (to show the side-by-side compare), 100+ articles updated after publication (25 of them 2–3 times), a week of hourly view stats per article with a visible bump after each update, and 800+ comments. A seeded random generator makes every run produce the same data.

## Project structure

```
the-daily-web/
├── server.js                  # Express app: view engine, sessions (in MongoDB), routes, error handlers
├── config/db.js               # Mongoose connection
├── src/
│   ├── models/                # User, Article, Comment, View (hourly view counters)
│   ├── controllers/           # article (public), comment, auth, reporter, editor, user (staff), stats, weather
│   ├── routes/                # index (public pages), api (Ajax/REST), auth, reporter, editor
│   ├── middleware/            # auth (server-side permissions), rateLimit (comments), errorHandler
│   └── utils/                 # logger (console + logs/error.log), categories (sections + aliases)
├── views/                     # EJS pages + partials (header, footer, comments, weather)
│   ├── reporter/              # my articles, create/edit with autosave
│   └── editor/                # dashboard (+ _rows partial for Ajax), review, stats, users
├── public/
│   ├── css/style.css          # the design system (Flexbox, responsive)
│   └── js/                    # feed, comments, editor (autosave), editor-dashboard, stats (chart), weather
├── seed/seed.js               # demo-data generator (npm run seed)
├── .env.example               # template for .env
└── design.md                  # UI/UX design system
```

## Features

- **Public feed** — infinite scroll (20 at a time), search, filter by section and by read/unread, sort by date or popularity — all via Ajax, no page reload. The first page is rendered on the server.
- **Article pages** — the full article is in the server-rendered HTML (SEO). Ajax comments appear instantly; a commenter can edit/delete their own comment and an editor can delete any. Guests are limited to 3 comments per minute (server-enforced, `429`). Every visit is counted for the statistics.
- **Roles & security** — Guest, Reporter, Editor. Passwords hashed with bcrypt; every permission check runs on the server (ownership, roles, locked pending articles); sessions are stored in MongoDB so logins survive a server restart.
- **Reporter workspace** — own articles only, with their status and the editor's notes. Draft → pending → published / returned, and no other transitions. **Continuous autosave** (no save button): a new article is created by its first keystroke; closing the tab sends the last edit. Editing a live article keeps the last approved version public until an editor approves the change.
- **Editor desk** — KPI counters; search / filter / sort all articles, done in the database with Ajax paging; review with a live-vs-proposed compare; edit any article; approve & publish; return with a required note; delete (with its comments and stats).
- **Staff management** — editors list, search, add, edit and remove reporter/editor accounts (full CRUD for users).
- **Impact Analytics** — Chart.js line of views over a real time axis, a dashed marker at every published update, and the average views before vs after each update.
- **Weather widget** — OpenWeatherMap, called and cached (15 min) on the server so the API key never reaches the browser and thousands of readers cause only a few API calls an hour.
- Errors are handled centrally (bad ids → 404, invalid data → 400, Ajax gets JSON) and logged; responsive layout for desktop, tablet and phone.

## Design decisions (for the defense)

- **Two copies of an article.** The top-level fields are the reporter's working copy; `published` holds the last approved version, which is all the public ever sees. Approving copies the working copy into `published`.
- **View statistics at scale.** No document per page view: one `View` document per article per hour with a counter that is `$inc`-ed (upsert). A popular article read 10,000 times in an hour is still one small document, so the chart query stays fast.
- **Update markers.** `article.updates` stores the time of every approved update after first publication; the chart draws them on the same time axis as the views.
- **Paging.** Every list sorts with an `_id` tie-breaker so skip/limit paging never repeats or skips items; page 1 (server) and page 2+ (Ajax) share one query builder.
- **Rate limit.** In-memory sliding window per IP — simple and fast; would move to a shared store if the app ran on several servers.

## Libraries

`express`, `mongoose`, `ejs`, `express-session`, `connect-mongo`, `bcryptjs`, `method-override`; Chart.js from a CDN for the analytics chart.

The spec allows only technologies taught in the course. `express`, `mongoose` and `ejs` are core; **confirm with the lecturer** that `bcryptjs`, `express-session`, `connect-mongo` and `method-override` are acceptable — they provide hashed passwords, restart-proof sessions, and form-based `PUT`/`DELETE`.

## Security

Never commit `.env`, passwords, API keys or tokens. `.env` is gitignored; `.env.example` only contains placeholders.

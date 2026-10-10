# The Daily Web

**Student:** Salim Khnefis  
**ID:** 322465238

Final project for **Web Applications Development** (summer semester): a news management, editing and publishing platform. Built only with the course stack: **Node.js, Express, MongoDB + Mongoose, EJS, vanilla JavaScript + Ajax, HTML5, CSS Flexbox**, following the **MVC** pattern.

This README covers the three items the project spec asks for:

1. [Installation and running](#1-installation-and-running)
2. [Project structure](#2-project-structure)
3. [Main functionality and features](#3-main-functionality-and-features)

---

## 1. Installation and running

### Prerequisites

- **Node.js 20.6 or newer** (the npm scripts use Node's built-in `--env-file-if-exists` flag)
- **MongoDB Community Server** running locally

### Steps

```bash
# 1. Install the dependencies
npm install

# 2. Install and start MongoDB (macOS / Homebrew; on Windows use the MongoDB installer)
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# 3. Create a .env file in the project root (see the template below)

# 4. Load the demo data. This wipes the database first.
npm run seed

# 5. Start the server
npm start        # or: npm run dev  (restarts automatically when a file changes)
```

Then open <http://localhost:3000>.

### The `.env` file

Create a file named `.env` in the project root with these values:

```ini
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/thedailyweb
SESSION_SECRET=any-long-random-string

# Weather widget: free OpenWeatherMap key, no credit card needed (https://openweathermap.org/api)
WEATHER_API_KEY=your-openweathermap-key
WEATHER_CITY=Haifa
WEATHER_UNITS=metric
# Optional: find the place by coordinates, for towns OpenWeatherMap doesn't know by name
# WEATHER_LAT=32.8056
# WEATHER_LON=35.1694
```

`.env` is gitignored, so no passwords or API keys are ever committed. Without a weather key the site still works; the widget just shows that the weather is unavailable.

### Demo logins (created by `npm run seed`)

| Role | Username | Password |
|------|----------|----------|
| Editor | `salom2` | `12345678` |
| Editor | `editor2` | `password` |
| Reporter | `salim` | `12345678` |
| Reporter | `reporter2` | `password` |
| Reporter | `reporter3` | `password` |
| Reporter | `reporter4` | `password` |

### Demo data

`npm run seed` generates all the data itself, with no external files:

- **520 original articles** across 8 sections (World, Politics, Business, Technology, Sport, Science, Health, Entertainment), with free photos from picsum.photos
- articles in every state: draft, pending approval, published, returned for fixes
- published articles with an edit waiting for approval, to show the live-vs-proposed compare
- 100+ articles updated after publication, 25 of them two or three times
- a week of hourly view statistics per article, with a visible bump after each update
- 800+ comments

The generator uses a fixed random seed, so every run produces the same data.

---

## 2. Project structure

```
the-daily-web/
├── server.js                 # entry point: Express setup, EJS, sessions stored in MongoDB, routes, error handlers
├── config/
│   └── db.js                 # Mongoose connection
├── src/
│   ├── models/               # M: Mongoose schemas
│   │   ├── User.js           #   reporters and editors (bcrypt-hashed passwords)
│   │   ├── Article.js        #   working copy + last approved ("published") copy, status, editor note, update times
│   │   ├── Comment.js        #   comments on articles
│   │   └── View.js           #   view statistics: one counter per article per hour
│   ├── controllers/          # C: the logic for each area
│   │   ├── articleController.js    # public feed and article page
│   │   ├── commentController.js    # add / edit / delete / list comments
│   │   ├── authController.js       # login / logout
│   │   ├── reporterController.js   # reporter workspace, autosave, submit for approval
│   │   ├── editorController.js     # editor dashboard, review, approve / return / delete
│   │   ├── userController.js       # staff management (users CRUD)
│   │   ├── statsController.js      # Impact Analytics data
│   │   └── weatherController.js    # OpenWeatherMap proxy with a 15-minute cache
│   ├── routes/               # URL → controller mapping
│   │   ├── index.js          #   public pages
│   │   ├── api.js            #   REST / Ajax endpoints (JSON)
│   │   ├── auth.js           #   login / logout
│   │   ├── reporter.js       #   reporter area
│   │   └── editor.js         #   editor area
│   ├── middleware/
│   │   ├── auth.js           #   server-side permission checks (logged in, role, ownership)
│   │   ├── rateLimit.js      #   guest comment limit (3 per minute per device)
│   │   └── errorHandler.js   #   404 and central error handling (HTML or JSON)
│   └── utils/
│       ├── logger.js         #   logs to the console and to logs/error.log
│       └── categories.js     #   site sections and category filter helpers
├── views/                    # V: EJS templates
│   ├── home.ejs              #   news feed
│   ├── article.ejs           #   full article (server-rendered for SEO)
│   ├── login.ejs, error.ejs
│   ├── partials/             #   header, footer, comments, weather widget
│   ├── reporter/             #   my articles, create / edit
│   └── editor/               #   dashboard (+ _rows partial for Ajax), review, stats, users
├── public/                   # static files sent to the browser
│   ├── css/style.css         #   the whole design (Flexbox, responsive)
│   └── js/                   #   vanilla JS + Ajax (fetch)
│       ├── feed.js           #     infinite scroll, search, filter, sort
│       ├── comments.js       #     comments without page reload
│       ├── editor.js         #     autosave while writing
│       ├── editor-dashboard.js #   editor list: search / filter / sort / paging
│       ├── stats.js          #     Impact Analytics chart (Chart.js)
│       └── weather.js        #     weather widget
├── seed/seed.js              # demo data generator (npm run seed)
├── design.md                 # UI design notes
└── package.json              # dependencies and npm scripts
```

---

## 3. Main functionality and features

### Users and permissions

- Three user types: **Guest**, **Reporter**, **Editor**. Reporters and editors log in with a username and password.
- Passwords are stored as **bcrypt hashes**, never as plain text.
- **Every permission check runs on the server** (role, article ownership, allowed state changes). Hiding a button in the browser is never the only protection.
- **Sessions are stored in MongoDB**, so a logged-in user stays logged in after a server restart.
- After login, a reporter goes to their workspace and an editor goes to the management area.

### Home page: the news feed

- Shows **published articles only**: title, image, summary, category, reporter and publish date.
- **Infinite scroll**: 20 more articles load automatically near the bottom of the page.
- **Search** by title, **filter** by category and by read / unread, **sort** by publish date or popularity.
- Search, filter, sort and loading more all happen with **Ajax**, without reloading the page. The first page is rendered on the server.

### Article page

- Title, reporter, category, publish date, main image and the full text are all in the **HTML the server returns**, so search engines can read the page without running JavaScript.
- **Comments**: a new comment appears in the list immediately, without reloading the list. Commenters can edit or delete their own comment, and an editor can delete any comment.
- **Spam limit**: a guest can post at most **3 comments per minute** from the same device. The server blocks the 4th with a `429` and a clear message.
- Every visit is counted for the view statistics.

### Reporter workspace

- A reporter sees **only their own articles** and the state of each one: *draft*, *pending approval*, *published*, *returned for fixes*.
- Create a new article, edit a draft, submit it for approval, read the editor's note on a returned article, fix it and submit it again.
- Only the allowed transitions are possible: draft → pending, pending → published or returned (editor only), returned → pending. The server rejects anything else.
- **Continuous autosave**, with no Save button. Closing the browser, refreshing, or moving to another computer loses nothing; the reporter always gets back the latest version.
- **Editing a published article**: readers keep seeing the last approved version while the reporter works and while the change waits for approval. The new content goes public only after an editor approves it.

### Editor area

- See **all articles** in the system, with search, filter by state and sort, all done in the database with Ajax paging, so it stays fast with thousands of articles.
- For a pending article: view it, edit it, **approve and publish**, **return it with a required note**, or **delete** it (its comments and statistics are deleted with it).
- For an edit of an already published article, the review page shows the **live version next to the proposed version**.
- **Staff management**: list, search, add, edit and remove reporter and editor accounts.

### Impact Analytics

- The editor picks an article and sees a **Chart.js graph of its views over time** on a real time axis.
- Every moment an editor approved and published an update is marked with a **dashed vertical line**.
- The page shows the **average views before and after each update**, so the effect of an update is easy to see.
- Built for thousands of readers: there is no document per page view. Each article has **one `View` document per hour** whose counter is incremented (`$inc` with upsert), so the chart query stays small and fast.

### Weather widget

- Shown in the sidebar, using the free **OpenWeatherMap** API (no credit card).
- The server calls the API and **caches the result for 15 minutes**, so the API key never reaches the browser and thousands of readers cause only a few API calls an hour. If the service fails, the site keeps working and the widget says so.

### Errors, logs and design

- Errors are handled on both the client and the server: invalid ids return 404, invalid data returns 400, Ajax requests get JSON errors, and bad input never crashes the server.
- Important events are logged to the console, and errors are also saved to `logs/error.log`.
- REST API for the Ajax calls, semantic HTML5, and a **responsive layout** for desktop, tablet and phone built with Flexbox.

### Libraries used

`express`, `mongoose`, `ejs`, `express-session`, `connect-mongo` (sessions in MongoDB), `bcryptjs` (password hashing), `method-override` (`PUT`/`DELETE` from HTML forms), and Chart.js from a CDN for the analytics chart.

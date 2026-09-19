# Build Guide — The Daily Web

This guide takes you from the scaffold to a complete project **that you write yourself**. Each step says *what to build*, *which files to touch*, *how to test it*, and *how to commit it*. It gives you direction and hints — **not** the finished code — so you can explain every line in the defense (the spec requires this).

The **Comments feature is fully written** as a reference. Whenever you're unsure of the *shape* of something (a model, a controller, a route, client Ajax), open the matching Comments file and copy the pattern.

---

## How to use this guide

- Do the steps **in order** — each builds on the last.
- **One feature = one branch = one pull request.** The spec grades your git workflow, so don't commit everything to `main`.
- After each step, run the app and check the "Test" box before moving on.
- Anywhere you see a file marked `[TODO]`, that's yours to implement. Files marked `[WORKED EXAMPLE ✅]` are done — study them.

### Git workflow (do this every step)

```bash
git checkout main && git pull
git checkout -b feature/<short-name>      # e.g. feature/article-model
# ...write code, test it...
git add -A
git commit -m "feat: <what you did>"
git push -u origin feature/<short-name>
# open a Pull Request on GitHub, get a teammate to review, then merge.
```

Commit message style: `feat:` new feature, `fix:` bug fix, `docs:` docs, `style:` CSS/formatting, `refactor:` restructure. Commit **often**, in small logical chunks.

---

## Step 0 — Setup (once per machine)

**Do:**
1. `npm install`
2. Install & start MongoDB locally:
   ```bash
   brew tap mongodb/brew
   brew install mongodb-community
   brew services start mongodb-community
   ```
3. `cp .env.example .env`, then set a real `SESSION_SECRET` (the file shows how to generate one).
4. `npm run dev` and open <http://localhost:3000>.

**Test:** the styled home page loads with placeholder stories and the red masthead rule. The server prints `MongoDB connected` and `The Daily Web running…`.

---

## Study first — the Comments worked example

Before writing anything, trace one request end-to-end through these files. This is the exact pattern every feature reuses:

| Layer | File | What to notice |
|-------|------|----------------|
| Model | `src/models/Comment.js` | schema, validation, `ref`, indexes |
| Controller | `src/controllers/commentController.js` | `async (req,res,next)`, try/catch, `next(err)`, status codes |
| Middleware | `src/middleware/rateLimit.js` | server-side enforcement of a rule |
| Route | `src/routes/api.js` | wiring middleware → controller |
| View (server render) | `views/partials/comments.ejs` | content is in the HTML for SEO |
| Client Ajax | `public/js/comments.js` | `fetch`, update DOM without reload, handle errors |

---

## Step 1 — Minimal Article model (so Comments becomes live)

**Branch:** `feature/article-model-min`
**Goal:** the smallest Article model + a real article route, so you can post a comment for real.
**Files:** `src/models/Article.js`, `src/routes/index.js`.

**Do:**
- In `Article.js`, implement just enough of the schema to save/read an article (title, body, category, author-as-plain-string for now, `status`, `publishedAt`). Follow the Comment.js pattern; export the model.
- In `index.js`, replace the placeholder `/article/:id` handler: load the real article by id from Mongo and pass it + its comments (`Comment.find`) to the view.

**Test:** create one article manually (`mongosh`, or a throwaway script), open its page, post a comment, watch it appear without a reload, refresh and see it persisted. Post 4 comments fast → the 4th is blocked with the rate-limit message.

**Commit:** `feat: minimal Article model and live article page with comments`

---

## Step 2 — Full Article model

**Branch:** `feature/article-model`
**Goal:** the complete schema that supports the whole workflow.
**Files:** `src/models/Article.js`.

**Do:** flesh out every field from the comments in `Article.js` — the four statuses, `editorNote`, author as a `ref: 'User'`, popularity, and your chosen design for the **published-vs-pending-edit** rule (keep the live version separate from pending edits, or version history — pick one and be able to justify it). Add a **text index** on `title` (and maybe `summary`) for search.

**Test:** in `mongosh`, confirm you can create articles in each status and that invalid data is rejected.
**Commit:** `feat: full Article schema with workflow states and search index`

---

## Step 3 — Users + password hashing

**Branch:** `feature/user-model`
**Files:** `src/models/User.js`.

**Do:** implement `User` (username, hashed password, role, displayName). Hash in a `pre('save')` hook with **bcryptjs**; add `comparePassword`. Follow the pattern already commented in the file.

**Test:** create a user in a script; verify the stored `password` is a bcrypt hash (not plain text) and `comparePassword('right')` is true, `comparePassword('wrong')` is false.
**Commit:** `feat: User model with bcrypt password hashing`

---

## Step 4 — Authentication & permissions

**Branch:** `feature/auth`
**Files:** `src/controllers/authController.js`, `src/routes/auth.js`, `src/middleware/auth.js`, `views/login.ejs`.

**Do:**
- Implement `renderLogin`, `login`, `logout` (see the file comments). On login, put `{ id, role, displayName }` on `req.session.user`.
- Implement `requireLogin` and `requireRole` in `middleware/auth.js` (replace the no-op stubs!).
- Uncomment the routes in `auth.js`.

**Test:** log in as a seeded reporter → redirected to `/reporter`; as editor → `/editor`. Wrong password shows a generic error. Restart the server while logged in → you're **still** logged in (sessions are in Mongo). Hitting `/editor` as a reporter → 403.
**Commit:** `feat: staff login, sessions, and role-based permission middleware`

---

## Step 5 — Public feed (server-rendered) + list API

**Branch:** `feature/feed`
**Files:** `src/controllers/articleController.js`, `src/routes/index.js`, `src/routes/api.js`, `views/home.ejs`.

**Do:** implement `renderHome` (first page of **published** articles, server-rendered) and `list` (JSON, published only, paginated 20/page). Wire `GET /api/articles`. Replace the placeholder cards in `home.ejs` with a loop over real `articles`.

**Test:** home shows real published articles; `GET /api/articles?page=1` returns JSON.
**Commit:** `feat: public news feed with paginated list API`

---

## Step 6 — Search, filter, sort (Ajax)

**Branch:** `feature/feed-search-filter`
**Files:** `src/controllers/articleController.js`, `public/js/feed.js`, `views/home.ejs`.

**Do:** extend `list` to honour `?search=`, `?category=`, `?seen=`/`unseen`, `?sort=date|popular`. In `feed.js`, wire the search box + sort select to re-request and re-render the feed **without a full refresh** (copy the fetch pattern from `comments.js`; debounce the search input). Decide how you track "seen" articles for a guest (session or cookie).

**Test:** typing filters results live; switching sort reorders; category links filter. No full page reloads.
**Commit:** `feat: Ajax search, filter and sort on the feed`

---

## Step 7 — Infinite scroll

**Branch:** `feature/infinite-scroll`
**Files:** `public/js/feed.js`.

**Do:** use an `IntersectionObserver` on `#feed-sentinel`; when it enters view, fetch the next page and **append** cards. Stop when the server reports no more. Keep it working together with search/filter/sort (reset to page 1 when those change).

**Test:** scrolling near the bottom loads 20 more; works with an active search/filter.
**Commit:** `feat: infinite scroll on the news feed`

---

## Step 8 — Article page + view tracking

**Branch:** `feature/article-page`
**Files:** `src/controllers/articleController.js`, `views/article.ejs`, `src/controllers/statsController.js`.

**Do:** finish `renderArticle` — load the published article, render the **full body in the HTML** (no JS dependency), include comments server-rendered, and call `statsController.recordView` for each visit. Make sure editing a published article doesn't change what the public sees until re-approval (your Step 2 design).

**Test:** view the page with JS disabled → full article text is present (SEO). Each refresh increments the view data.
**Commit:** `feat: SEO-friendly article page with view tracking`

---

## Step 9 — Reporter workspace + auto-save

**Branch:** `feature/reporter`
**Files:** `src/controllers/reporterController.js`, `src/routes/reporter.js`, `views/reporter/*.ejs`.

**Do:** implement the dashboard (own articles by status), create/edit forms, submit-for-approval, and the **workflow transitions** (enforce allowed moves on the server). Add **auto-save**: the edit form saves to the server on a debounce (no Save button) so work survives refresh/close/another machine. Enforce ownership everywhere.

**Test:** a reporter sees only their own articles; can't edit someone else's (even by editing the URL); a draft survives a refresh mid-typing; illegal status jumps are rejected.
**Commit:** `feat: reporter workspace with workflow and auto-save`

---

## Step 10 — Editor area

**Branch:** `feature/editor`
**Files:** `src/controllers/editorController.js`, `src/routes/editor.js`, `views/editor/dashboard.ejs`.

**Do:** implement viewing all articles (filter by status), edit, **approve & publish**, **return for corrections with a required note**, and delete. For an edit to a published article, show the editor the **current public version vs the pending new version**. Approving makes the new content public and records an update marker (for Step 11).

**Test:** editor approves a pending article → it appears on the public feed; returns one with a note → the reporter sees the note and can resubmit; deleting removes it.
**Commit:** `feat: editor review, approve/return/delete workflow`

---

## Step 11 — Impact Analytics chart

**Branch:** `feature/analytics`
**Files:** `src/models/View.js`, `src/controllers/statsController.js`, `views/editor/stats.ejs`, `public/js/editor.js`.

**Do:** finish the `View` model (bucketed counts — think about scale), `articleStats` (return `{ series, updates }`), and the chart (Chart.js or `<canvas>`) that plots views over time with clear markers at each update-publish point.

**Test:** open stats for an article that was updated after publishing → the graph shows the trend and marks the update point(s).
**Commit:** `feat: Impact Analytics views-over-time chart`

---

## Step 12 — Weather widget

**Branch:** `feature/weather`
**Files:** a small weather controller + `GET /api/weather` in `api.js`, `views/partials/weather.ejs`, `public/js/weather.js`.

**Do:** call OpenWeatherMap **from the server** (key stays server-side), **cache** the result for ≤15 min, expose it at `/api/weather`, and render it in the sidebar via `weather.js`. Handle the API being down gracefully.

**Test:** the widget shows current weather; disabling the network shows a friendly fallback, not a crash; the API isn't called on every page load (cache works).
**Commit:** `feat: cached weather widget via server proxy`

---

## Step 13 — Seed demo data

**Branch:** `feature/seed`
**Files:** `seed/seed.js`.

**Do:** generate **500+ articles** across categories and all four statuses, several reporters + an editor, comments, several published articles updated a few times, and enough view data (with update markers) for the analytics graph. Make it idempotent (`deleteMany` first). Print demo credentials to the console.

**Test:** `npm run seed` then browse — feed is full, analytics has data, every status is represented.
**Commit:** `feat: seed script with 500+ demo articles`

---

## Step 14 — Hardening & polish

**Branch:** `feature/polish`
**Do:** review error handling and edge cases on **both** client and server (bad ids, missing fields, unauthorized actions never crash the server); confirm logging of errors/important events; check performance with the full dataset; run the `design.md` pre-delivery checklist (contrast, focus, reduced motion, responsive at 375/768/1280, alt text, no emoji icons). Update the README's "Core functionality" to match what's done.

**Commit:** `chore: error handling, performance and accessibility polish`

---

## Before you submit (spec checklist)

- [ ] MVC separation is clean (models / controllers / views).
- [ ] 4 models with full CRUD; search on a central field.
- [ ] 3 roles; all permission checks on the **server**; passwords hashed; sessions survive restart.
- [ ] Feed: infinite scroll + search + filter + sort, all without full refresh.
- [ ] Article page server-rendered (works with JS off); comments via Ajax; 3/min guest limit.
- [ ] Reporter workflow + auto-save; editor approve/return/delete; current-vs-pending for edits.
- [ ] Impact Analytics graph with update markers.
- [ ] Weather widget (no credit-card route), cached ≤15 min.
- [ ] 500+ seeded articles covering every state.
- [ ] README (install/run, structure, features). No secrets in the repo.
- [ ] Git history shows branches, PRs, merges and each member's contribution.
- [ ] Every team member can explain every file.

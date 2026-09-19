// public/js/feed.js — [TODO — GUIDE steps 6-7]  home feed interactivity
//
// Everything here talks to GET /api/articles and updates the #feed WITHOUT a full page refresh.
// Copy the fetch pattern from comments.js.
//
// Build:
//   1) SEARCH   — on input (debounced ~300ms), request ?search=... and replace the feed.
//   2) FILTER   — category + viewed/not-viewed -> query params.
//   3) SORT     — date | popular -> ?sort=.
//   4) INFINITE SCROLL — watch #feed-sentinel with IntersectionObserver; when it enters view,
//      request the next ?page= (20 per page) and APPEND the results. Stop when the server says
//      there are no more.
//
// Keep one function that builds the query string from the current search/filter/sort/page state
// so all four features share it. Render each article as a card (same markup as home.ejs) using
// textContent / createElement — never innerHTML with server strings you didn't escape.

// TODO: implement. Left empty so it loads without error.

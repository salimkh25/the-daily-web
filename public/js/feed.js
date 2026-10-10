// feed.js - search, category, read/unread filter, sort and infinite scroll on the home page.
// the server renders page 1; this script loads page 2, 3, ... from GET /api/articles as you
// scroll, and re-queries page 1 whenever a filter changes - all without reloading the page.

const PAGE_SIZE = 20; // same page size as the server

const urlParams = new URLSearchParams(window.location.search);
const state = {
  search: urlParams.get('search') || '',
  category: urlParams.get('category') || '',
  seen: urlParams.get('seen') || '',
  sort: urlParams.get('sort') === 'popular' ? 'popular' : 'date',
  page: 1,
};

// every fresh query gets a new id. when a response comes back we check it's still the latest,
// so a slow answer for "ne" can't overwrite the results for "news" that the user typed after it.
let requestId = 0;
let loadingMore = false;
let reachedEnd = false;

const feedContainer = document.getElementById('feed');
const sentinel = document.getElementById('feed-sentinel');
const searchInput = document.getElementById('feed-search');
const searchForm = document.querySelector('.masthead__search');
const sortSelect = document.getElementById('feed-sort');
const seenSelect = document.getElementById('feed-seen');
const heroSection = document.querySelector('.hero');
const headingFlag = document.querySelector('.section-flag-heading .section-flag');

// the 3 hero stories are the start of page 1 - remember them so they aren't repeated in the grid
const heroIds = new Set(
  Array.from(document.querySelectorAll('.hero a[href^="/article/"]')).map((a) => a.getAttribute('href').split('/').pop())
);

// same aliases as the server (src/utils/categories.js)
function displayCategory(cat) {
  if (!cat) return '';
  if (/^tech/i.test(cat)) return 'Technology';
  if (/^(entertainment|culture)/i.test(cat)) return 'Entertainment';
  if (/^sport/i.test(cat)) return 'Sport';
  return cat;
}

function isPlainFrontPage() {
  return !state.search && !state.category && !state.seen && state.sort === 'date';
}

function createArticleCard(article) {
  const card = document.createElement('article');
  card.className = 'card';

  if (article.image) {
    const img = document.createElement('img');
    img.className = 'card__media';
    img.src = article.image;
    img.alt = article.title || '';
    img.loading = 'lazy';
    card.appendChild(img);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'card__media card__media--placeholder';
    card.appendChild(placeholder);
  }

  const body = document.createElement('div');
  body.className = 'card__body';

  // textContent everywhere (never innerHTML) so article text can't inject html
  const flag = document.createElement('span');
  flag.className = 'section-flag';
  flag.textContent = article.category || 'News';
  body.appendChild(flag);

  const title = document.createElement('h3');
  title.className = 'card__title';
  const titleLink = document.createElement('a');
  titleLink.href = `/article/${article._id}`;
  titleLink.textContent = article.title;
  title.appendChild(titleLink);
  body.appendChild(title);

  const summary = document.createElement('p');
  summary.className = 'card__summary';
  summary.textContent = article.summary || '';
  body.appendChild(summary);

  const meta = document.createElement('p');
  meta.className = 'meta';
  const authorName = article.author ? article.author.displayName : 'Reporter';
  const dateStr = article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('en-GB') : '';
  meta.textContent = `By ${authorName} · ${dateStr}`;
  body.appendChild(meta);

  card.appendChild(body);
  return card;
}

function buildParams(page) {
  const params = new URLSearchParams({ page, sort: state.sort });
  if (state.search) params.set('search', state.search);
  if (state.category) params.set('category', state.category);
  if (state.seen) params.set('seen', state.seen);
  return params;
}

function setSentinel(visible) {
  if (sentinel) sentinel.style.display = visible ? 'block' : 'none';
}

function showFeedMessage(text) {
  feedContainer.innerHTML = '';
  const msg = document.createElement('p');
  msg.className = 'muted';
  msg.textContent = text;
  feedContainer.appendChild(msg);
  setSentinel(false);
}

function renderArticles(articles, append) {
  if (!append) feedContainer.innerHTML = '';
  if (!append && articles.length === 0) {
    showFeedMessage('No articles found.');
    reachedEnd = true;
    return;
  }

  const skipHeroStories = heroSection && isPlainFrontPage();
  articles.forEach((article) => {
    if (skipHeroStories && heroIds.has(article._id)) return;
    feedContainer.appendChild(createArticleCard(article));
  });

  // a short page means there is nothing after it
  reachedEnd = articles.length < PAGE_SIZE;
  setSentinel(!reachedEnd);

  // on a tall screen the sentinel can still be visible after appending - keep filling
  requestAnimationFrame(() => {
    if (!reachedEnd && sentinel && sentinel.getBoundingClientRect().top < window.innerHeight) loadMore();
  });
}

// headline, hero, active nav link, selects and the address bar all follow `state`
function syncUi({ pushHistory = false } = {}) {
  if (heroSection) heroSection.style.display = isPlainFrontPage() ? '' : 'none';
  if (headingFlag) {
    headingFlag.textContent = state.search ? `Search: "${state.search}"` : (displayCategory(state.category) || 'Latest');
  }

  const active = displayCategory(state.category).toLowerCase();
  document.querySelectorAll('.catnav__link').forEach((link) => {
    const linkCat = displayCategory(link.getAttribute('data-category') || '').toLowerCase();
    link.classList.toggle('is-active', linkCat === active);
  });

  if (sortSelect) sortSelect.value = state.sort;
  if (seenSelect) seenSelect.value = state.seen;
  if (searchInput && document.activeElement !== searchInput) searchInput.value = state.search;

  const query = new URLSearchParams();
  if (state.search) query.set('search', state.search);
  if (state.category) query.set('category', state.category);
  if (state.seen) query.set('seen', state.seen);
  if (state.sort !== 'date') query.set('sort', state.sort);
  const url = query.toString() ? `/?${query}` : '/';
  if (pushHistory) window.history.pushState({}, '', url);
  else window.history.replaceState({}, '', url);
}

// a filter changed: load page 1 again and replace the grid
async function reloadFeed(options) {
  const myId = ++requestId;
  state.page = 1;
  reachedEnd = false;
  syncUi(options);

  try {
    const res = await fetch(`/api/articles?${buildParams(1)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const articles = await res.json();
    if (myId !== requestId) return; // a newer query started while we waited - ignore this answer
    renderArticles(articles, false);
  } catch (err) {
    console.error('Feed error:', err);
    if (myId === requestId) showFeedMessage('Could not load articles. Please try again.');
  }
}

// infinite scroll: append the next page
async function loadMore() {
  if (loadingMore || reachedEnd) return;
  loadingMore = true;
  const myId = requestId;

  try {
    const res = await fetch(`/api/articles?${buildParams(state.page + 1)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const articles = await res.json();
    if (myId !== requestId) return; // filters changed meanwhile, this page belongs to the old query
    state.page += 1;
    renderArticles(articles, true);
  } catch (err) {
    console.error('Feed error:', err);
  } finally {
    loadingMore = false;
  }
}

// ---- wiring ----

// category nav: switch category without a page reload (back/forward still works via pushState)
document.querySelectorAll('.catnav__link').forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const chosen = new URL(link.href, window.location.origin).searchParams.get('category') || '';
    if (chosen === state.category && !state.search) return; // already showing it
    state.category = chosen;
    state.search = '';
    if (searchInput) searchInput.value = '';
    reloadFeed({ pushHistory: true });
  });
});

window.addEventListener('popstate', () => {
  const params = new URLSearchParams(window.location.search);
  state.search = params.get('search') || '';
  state.category = params.get('category') || '';
  state.seen = params.get('seen') || '';
  state.sort = params.get('sort') === 'popular' ? 'popular' : 'date';
  reloadFeed();
});

// search: live while typing (debounced) and on enter
let searchTimeout;
if (searchInput) {
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.search = searchInput.value.trim();
      reloadFeed();
    }, 300);
  });
}
if (searchForm) {
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(searchTimeout);
    state.search = searchInput ? searchInput.value.trim() : '';
    reloadFeed();
  });
}

if (sortSelect) {
  sortSelect.addEventListener('change', () => {
    state.sort = sortSelect.value === 'popular' ? 'popular' : 'date';
    reloadFeed();
  });
}

if (seenSelect) {
  seenSelect.addEventListener('change', () => {
    state.seen = seenSelect.value;
    reloadFeed();
  });
}

// the server rendered page 1 - if it wasn't full there is no page 2
const renderedCount = feedContainer.querySelectorAll('.card').length + (heroSection ? heroIds.size : 0);
reachedEnd = renderedCount < PAGE_SIZE;
setSentinel(!reachedEnd);

// load the next page a little before the user reaches the bottom
if (sentinel && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) loadMore();
  }, { rootMargin: '300px' });
  observer.observe(sentinel);
}

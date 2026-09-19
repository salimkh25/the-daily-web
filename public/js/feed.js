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

let currentPage = 1;
let currentSearch = '';
let currentSort = 'date';
let isLoading = false;

const feedContainer = document.getElementById('feed');
const sentinel = document.getElementById('feed-sentinel');
const searchInput = document.getElementById('feed-search');
const sortSelect = document.getElementById('feed-sort');

function createArticleCard(article) {
  const card = document.createElement('article');
  card.className = 'card';

  if (article.image) {
    const img = document.createElement('img');
    img.className = 'card__media';
    img.src = article.image;
    img.alt = article.title;
    card.appendChild(img);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'card__media card__media--placeholder';
    card.appendChild(placeholder);
  }

  const body = document.createElement('div');
  body.className = 'card__body';

  const flag = document.createElement('span');
  flag.className = 'section-flag';
  flag.textContent = article.category;
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
  summary.textContent = article.summary;
  body.appendChild(summary);

  const meta = document.createElement('p');
  meta.className = 'meta';
  const authorName = article.author ? article.author.displayName : 'Reporter';
  const dateStr = new Date(article.publishedAt).toLocaleDateString('en-GB');
  meta.textContent = `By ${authorName} · ${dateStr}`;
  body.appendChild(meta);

  card.appendChild(body);
  return card;
}

async function fetchFeed(append = false) {
  if (isLoading) return;
  isLoading = true;

  try {
    const params = new URLSearchParams({
      page: currentPage,
      sort: currentSort
    });
    if (currentSearch) params.set('search', currentSearch);

    const res = await fetch(`/api/articles?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch articles');
    
    const articles = await res.json();

    if (!append) {
      feedContainer.innerHTML = ''; // Clear for new search/sort
    }

    articles.forEach(article => {
      feedContainer.appendChild(createArticleCard(article));
    });

    if (articles.length < 20) {
      sentinel.style.display = 'none'; // No more items
    } else {
      sentinel.style.display = 'block';
    }
  } catch (err) {
    console.error('Feed error:', err);
  } finally {
    isLoading = false;
  }
}

// Search (Debounced)
let searchTimeout;
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentSearch = e.target.value.trim();
      currentPage = 1;
      fetchFeed(false);
    }, 300);
  });
}

// Sort
if (sortSelect) {
  sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    currentPage = 1;
    fetchFeed(false);
  });
}

// Infinite Scroll
if (sentinel && window.IntersectionObserver) {
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      currentPage++;
      fetchFeed(true);
    }
  }, { rootMargin: '100px' });
  observer.observe(sentinel);
}

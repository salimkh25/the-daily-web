// feed.js - client side search, sorting, category filtering and infinite scroll
// talking to GET /api/articles without reloading the whole page

const urlParams = new URLSearchParams(window.location.search);
let currentPage = 1;
let currentSearch = urlParams.get('search') || '';
let currentSort = urlParams.get('sort') || 'date';
let currentCategory = urlParams.get('category') || '';
let currentSeen = urlParams.get('seen') || '';
let isLoading = false;

const feedContainer = document.getElementById('feed');
const sentinel = document.getElementById('feed-sentinel');
const searchInput = document.getElementById('feed-search');
const sortSelect = document.getElementById('feed-sort');
const seenSelect = document.getElementById('feed-seen');
const heroSection = document.querySelector('.hero');
const headingFlag = document.querySelector('.section-flag-heading .section-flag');
const searchForm = document.querySelector('.masthead__search');

// if arriving with an active search query, update the hero and heading
if (currentSearch) {
  if (heroSection) heroSection.style.display = 'none';
  if (headingFlag) headingFlag.textContent = `Search: "${currentSearch}"`;
}

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

// pull articles from api and stick them in feed
async function fetchFeed(append = false) {
  if (isLoading) return;
  isLoading = true;

  try {
    const params = new URLSearchParams({
      page: currentPage,
      sort: currentSort
    });
    if (currentSearch) params.set('search', currentSearch);
    if (currentCategory) params.set('category', currentCategory);
    if (currentSeen) params.set('seen', currentSeen);

    const res = await fetch(`/api/articles?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch articles');
    
    const articles = await res.json();

    if (!append) {
      feedContainer.innerHTML = ''; // wipe old stuff for fresh query
    }

    if (!append && articles.length === 0) {
      const msg = document.createElement('p');
      msg.className = 'muted';
      msg.textContent = 'No articles found.';
      feedContainer.appendChild(msg);
      if (sentinel) sentinel.style.display = 'none';
      return;
    }

    articles.forEach(article => {
      feedContainer.appendChild(createArticleCard(article));
    });

    if (sentinel) {
      if (articles.length < 20) {
        sentinel.style.display = 'none'; // hit the bottom
      } else {
        sentinel.style.display = 'block';
      }
    }
  } catch (err) {
    console.error('Feed error:', err);
  } finally {
    isLoading = false;
  }
}

// update active class on header nav links
function updateNavHighlight(cat) {
  const norm = (cat || '').toLowerCase();
  document.querySelectorAll('.catnav__link').forEach(link => {
    const linkCat = (link.getAttribute('data-category') || '').toLowerCase();
    const isAct = (!norm && !linkCat) || (norm && (norm === linkCat || (norm === 'technology' && linkCat === 'tech') || (norm === 'tech' && linkCat === 'technology') || (norm === 'culture' && linkCat === 'entertainment') || (norm === 'entertainment' && linkCat === 'culture')));
    if (isAct) {
      link.classList.add('is-active');
    } else {
      link.classList.remove('is-active');
    }
  });
}

// category nav bar clicks - switch category without full page refresh
document.querySelectorAll('.catnav__link').forEach(link => {
  link.addEventListener('click', (e) => {
    // only do ajax if we already on home page
    if (window.location.pathname !== '/' && window.location.pathname !== '') {
      return;
    }

    e.preventDefault();
    const targetUrl = new URL(link.href, window.location.origin);
    const chosenCat = targetUrl.searchParams.get('category') || '';

    if (chosenCat === currentCategory && !currentSearch) {
      return; // already looking at it
    }

    currentCategory = chosenCat;
    currentSearch = '';
    if (searchInput) searchInput.value = '';
    currentPage = 1;

    updateNavHighlight(currentCategory);
    window.history.pushState({ category: currentCategory }, '', link.href);

    if (headingFlag) {
      let display = 'Latest';
      if (currentCategory) {
        display = currentCategory.toLowerCase() === 'tech' ? 'Technology' : currentCategory;
      }
      headingFlag.textContent = display;
    }

    if (heroSection) {
      heroSection.style.display = currentCategory ? 'none' : '';
    }

    fetchFeed(false);
  });
});

// handle back and forward buttons in browser
window.addEventListener('popstate', () => {
  if (window.location.pathname !== '/' && window.location.pathname !== '') {
    return;
  }
  const params = new URLSearchParams(window.location.search);
  currentCategory = params.get('category') || '';
  currentSearch = '';
  if (searchInput) searchInput.value = '';
  currentPage = 1;

  updateNavHighlight(currentCategory);

  if (headingFlag) {
    let display = 'Latest';
    if (currentCategory) {
      display = currentCategory.toLowerCase() === 'tech' ? 'Technology' : currentCategory;
    }
    headingFlag.textContent = display;
  }

  if (heroSection) {
    heroSection.style.display = currentCategory ? 'none' : '';
  }

  fetchFeed(false);
});

// title bar search submit handling
if (searchForm) {
  searchForm.addEventListener('submit', (e) => {
    // on home page, intercept submit so we dont do a full page reload
    if (window.location.pathname === '/' || window.location.pathname === '') {
      e.preventDefault();
      clearTimeout(searchTimeout);
      currentSearch = searchInput ? searchInput.value.trim() : '';
      currentPage = 1;

      if (heroSection) {
        heroSection.style.display = (currentSearch || currentCategory) ? 'none' : '';
      }

      if (headingFlag) {
        if (currentSearch) {
          headingFlag.textContent = `Search: "${currentSearch}"`;
        } else {
          headingFlag.textContent = currentCategory ? (currentCategory === 'Tech' ? 'Technology' : currentCategory) : 'Latest';
        }
      }

      const query = new URLSearchParams();
      if (currentSearch) query.set('search', currentSearch);
      if (currentCategory) query.set('category', currentCategory);
      if (currentSort && currentSort !== 'date') query.set('sort', currentSort);
      window.history.replaceState({}, '', query.toString() ? `/?${query.toString()}` : '/');

      fetchFeed(false);
    }
  });
}

// search with small debounce so we dont spam api
let searchTimeout;
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentSearch = e.target.value.trim();
      currentPage = 1;

      // hide hero while searching so user sees only matching results
      if (heroSection) {
        heroSection.style.display = (currentSearch || currentCategory) ? 'none' : '';
      }

      if (headingFlag) {
        if (currentSearch) {
          headingFlag.textContent = `Search: "${currentSearch}"`;
        } else {
          headingFlag.textContent = currentCategory ? (currentCategory === 'Tech' ? 'Technology' : currentCategory) : 'Latest';
        }
      }

      const query = new URLSearchParams();
      if (currentSearch) query.set('search', currentSearch);
      if (currentCategory) query.set('category', currentCategory);
      if (currentSort && currentSort !== 'date') query.set('sort', currentSort);
      window.history.replaceState({}, '', query.toString() ? `/?${query.toString()}` : '/');

      fetchFeed(false);
    }, 250);
  });
}

// sort dropdown (date or popular)
if (sortSelect) {
  sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    currentPage = 1;
    fetchFeed(false);
  });
}

// read-status filter (all / unread / read) - uses the articles you've opened this session
if (seenSelect) {
  seenSelect.addEventListener('change', (e) => {
    currentSeen = e.target.value;
    currentPage = 1;
    fetchFeed(false);
  });
}

// infinite scroll observer - loads next batch when sentinel shows up
if (sentinel && window.IntersectionObserver) {
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !isLoading) {
      currentPage++;
      fetchFeed(true);
    }
  }, { rootMargin: '100px' });
  observer.observe(sentinel);
}

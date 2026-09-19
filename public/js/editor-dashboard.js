// editor-dashboard.js - real time filtering and sorting on the editor articles table
// lets the editor sort by clicks, status or genre without waiting for full page reloads

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('editor-search');
  const statusSelect = document.getElementById('editor-status');
  const genreSelect = document.getElementById('editor-genre');
  const sortSelect = document.getElementById('editor-sort');
  const articleList = document.getElementById('article-list');
  const resultsCount = document.getElementById('results-count');
  const noResultsMsg = document.getElementById('no-results-msg');
  const statCards = document.querySelectorAll('.stat-card[data-filter-status]');

  if (!articleList) return;

  const items = Array.from(articleList.querySelectorAll('.article-list-item'));
  const totalCount = items.length;

  function updateView() {
    const searchTerm = (searchInput ? searchInput.value : '').trim().toLowerCase();
    const chosenStatus = statusSelect ? statusSelect.value : 'all';
    const chosenGenre = genreSelect ? genreSelect.value.toLowerCase() : 'all';
    const chosenSort = sortSelect ? sortSelect.value : 'updated';

    // 1. filter the items based on search, status, and genre
    const visibleItems = items.filter(item => {
      const title = item.dataset.title || '';
      const author = item.dataset.author || '';
      const status = item.dataset.status || '';
      const genre = item.dataset.genre || '';

      // text search matches either title or author
      const matchesSearch = !searchTerm || title.includes(searchTerm) || author.includes(searchTerm);

      // status match
      const matchesStatus = chosenStatus === 'all' || status === chosenStatus;

      // genre match (handles tech vs technology alias)
      let matchesGenre = false;
      if (chosenGenre === 'all') {
        matchesGenre = true;
      } else if (chosenGenre === 'technology' || chosenGenre === 'tech') {
        matchesGenre = genre === 'technology' || genre === 'tech';
      } else if (chosenGenre === 'entertainment' || chosenGenre === 'culture') {
        matchesGenre = genre === 'entertainment' || genre === 'culture';
      } else {
        matchesGenre = genre === chosenGenre;
      }

      return matchesSearch && matchesStatus && matchesGenre;
    });

    // 2. sort the visible items
    visibleItems.sort((a, b) => {
      if (chosenSort === 'views') {
        const vA = parseInt(a.dataset.views, 10) || 0;
        const vB = parseInt(b.dataset.views, 10) || 0;
        return vB - vA; // highest clicked first
      }

      if (chosenSort === 'status') {
        // editor workflow priorities: pending approval first!
        const priority = { pending: 1, returned: 2, draft: 3, published: 4 };
        const pA = priority[a.dataset.status] || 99;
        const pB = priority[b.dataset.status] || 99;
        if (pA !== pB) return pA - pB;
        // secondary sort by newest
        return (parseInt(b.dataset.updated, 10) || 0) - (parseInt(a.dataset.updated, 10) || 0);
      }

      if (chosenSort === 'genre') {
        const gA = a.dataset.genre || '';
        const gB = b.dataset.genre || '';
        const comp = gA.localeCompare(gB);
        if (comp !== 0) return comp;
        return (parseInt(b.dataset.updated, 10) || 0) - (parseInt(a.dataset.updated, 10) || 0);
      }

      if (chosenSort === 'oldest') {
        return (parseInt(a.dataset.updated, 10) || 0) - (parseInt(b.dataset.updated, 10) || 0);
      }

      // default: recently updated (newest first)
      return (parseInt(b.dataset.updated, 10) || 0) - (parseInt(a.dataset.updated, 10) || 0);
    });

    // 3. update DOM: hide non-matching items and reorder visible items
    items.forEach(item => {
      item.style.display = 'none';
    });

    visibleItems.forEach(item => {
      item.style.display = '';
      articleList.appendChild(item); // reordering
    });

    // 4. update results counter
    if (resultsCount) {
      resultsCount.innerHTML = `Showing <strong>${visibleItems.length}</strong> of ${totalCount} articles`;
    }

    if (noResultsMsg) {
      noResultsMsg.style.display = visibleItems.length === 0 ? 'block' : 'none';
    }

    // 5. update stat card highlights
    statCards.forEach(card => {
      const cardStatus = card.getAttribute('data-filter-status');
      if (cardStatus === chosenStatus) {
        card.classList.add('is-active');
      } else {
        card.classList.remove('is-active');
      }
    });

    // 6. sync URL query string so browser back/refresh keeps the exact filter
    const query = new URLSearchParams();
    if (chosenSort && chosenSort !== 'updated') query.set('sort', chosenSort);
    if (chosenStatus && chosenStatus !== 'all') query.set('status', chosenStatus);
    if (chosenGenre && chosenGenre !== 'all') query.set('genre', chosenGenre);
    if (searchTerm) query.set('search', searchTerm);

    const newUrl = query.toString() ? `${window.location.pathname}?${query.toString()}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }

  // wire event listeners
  let searchDebounce;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(updateView, 120);
    });
  }

  if (statusSelect) {
    statusSelect.addEventListener('change', updateView);
  }

  if (genreSelect) {
    genreSelect.addEventListener('change', updateView);
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', updateView);
  }

  // clicking a KPI counter card filters by that status immediately
  statCards.forEach(card => {
    card.addEventListener('click', () => {
      const status = card.getAttribute('data-filter-status');
      if (statusSelect) {
        statusSelect.value = status;
        updateView();
      }
    });

    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });
});

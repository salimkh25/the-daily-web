// editor-dashboard.js - search / filter / sort the editor's article list without reloading the page.
// the SERVER does the filtering, sorting and paging (there can be thousands of articles, so we never
// send them all to the browser). GET /editor?...&partial=1 answers with the ready-made <li> rows
// (views/editor/_rows.ejs) which we swap in, and "Load more" appends the next page.

document.addEventListener('DOMContentLoaded', () => {
  const list = document.getElementById('article-list');
  if (!list) return;

  const searchInput = document.getElementById('editor-search');
  const statusSelect = document.getElementById('editor-status');
  const genreSelect = document.getElementById('editor-genre');
  const sortSelect = document.getElementById('editor-sort');
  const resultsCount = document.getElementById('results-count');
  const noResultsMsg = document.getElementById('no-results-msg');
  const loadMoreBtn = document.getElementById('load-more');
  const statCards = document.querySelectorAll('.stat-card[data-filter-status]');

  let page = 1;
  let requestId = 0; // ignore answers that belong to an older filter

  function filterParams() {
    const q = new URLSearchParams();
    const search = searchInput.value.trim();
    if (search) q.set('search', search);
    if (statusSelect.value !== 'all') q.set('status', statusSelect.value);
    if (genreSelect.value !== 'all') q.set('genre', genreSelect.value);
    if (sortSelect.value !== 'updated') q.set('sort', sortSelect.value);
    return q;
  }

  function showCount(shown, matching) {
    resultsCount.textContent = '';
    const strong = document.createElement('strong');
    strong.textContent = shown;
    resultsCount.append('Showing ', strong, ` of ${matching} matching articles`);
  }

  async function load(append) {
    const myId = append ? requestId : ++requestId;
    const nextPage = append ? page + 1 : 1;
    const q = filterParams();
    q.set('page', nextPage);
    q.set('partial', '1');
    loadMoreBtn.disabled = true;

    try {
      const res = await fetch(`/editor?${q}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text(); // escaped by EJS on the server
      if (myId !== requestId) return;

      page = nextPage;
      if (append) list.insertAdjacentHTML('beforeend', html);
      else list.innerHTML = html;

      const shown = list.querySelectorAll('.article-list-item').length;
      showCount(shown, Number(res.headers.get('X-Total-Count')) || 0);
      list.hidden = shown === 0;
      noResultsMsg.hidden = shown > 0;
      loadMoreBtn.hidden = res.headers.get('X-Has-More') !== '1';
    } catch (err) {
      console.error('Dashboard error:', err);
      if (myId === requestId) resultsCount.textContent = 'Could not load articles. Please try again.';
    } finally {
      loadMoreBtn.disabled = false;
    }
  }

  // a filter changed: highlight the matching KPI card, keep the url shareable, reload page 1
  function refresh() {
    statCards.forEach((card) => card.classList.toggle('is-active', card.dataset.filterStatus === statusSelect.value));
    const q = filterParams().toString();
    window.history.replaceState({}, '', q ? `/editor?${q}` : '/editor');
    load(false);
  }

  let searchDebounce;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(refresh, 250);
  });
  statusSelect.addEventListener('change', refresh);
  genreSelect.addEventListener('change', refresh);
  sortSelect.addEventListener('change', refresh);
  loadMoreBtn.addEventListener('click', () => load(true));

  // clicking a KPI card filters by that status
  statCards.forEach((card) => {
    card.addEventListener('click', () => {
      statusSelect.value = card.dataset.filterStatus;
      refresh();
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });
});

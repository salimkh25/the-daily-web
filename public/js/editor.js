// autosave for the reporter's article form - there is no save button.
// every change is sent to the server ~1 second after the reporter stops typing, so a refresh,
// a closed tab or opening the article on another computer always shows the latest version.
// a brand new article gets created on the server by its first save.

const form = document.getElementById('article-form');
const indicator = document.getElementById('autosave-indicator');
const submitForm = document.getElementById('submit-form');

if (form && indicator) {
  const FIELDS = ['title', 'category', 'image', 'summary', 'body'];
  let articleId = form.dataset.articleId || null;
  let dirty = false;       // there are changes the server doesn't have yet
  let timer = null;
  let queue = Promise.resolve(true); // saves run one after another, never in parallel

  function setStatus(text, isError) {
    indicator.textContent = text;
    indicator.classList.toggle('is-error', Boolean(isError));
  }

  function readFields() {
    const data = {};
    FIELDS.forEach((name) => { data[name] = form.elements[name].value; });
    return data;
  }

  function request(keepalive) {
    // the first save of a new article creates it (POST), after that we update it (PATCH)
    return fetch(articleId ? `/reporter/articles/${articleId}/autosave` : '/reporter/articles', {
      method: articleId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(readFields()),
      keepalive,
    });
  }

  async function doSave() {
    if (!dirty) return true;
    dirty = false; // anything typed from now on marks it dirty again
    setStatus('Saving…');
    try {
      const res = await request(false);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `server answered ${res.status}`);

      if (!articleId) {
        // the article exists now - switch the page over to it without reloading
        articleId = data.id;
        form.action = `/reporter/articles/${articleId}?_method=PUT`;
        window.history.replaceState({}, '', `/reporter/articles/${articleId}/edit`);
        if (submitForm) {
          submitForm.action = `/reporter/articles/${articleId}/submit`;
          submitForm.hidden = false;
        }
      }
      setStatus(`Saved at ${new Date().toLocaleTimeString()}`);
      return true;
    } catch (err) {
      console.error('Autosave error:', err);
      dirty = true; // still unsaved - try again shortly
      setStatus(`Not saved: ${err.message}. Retrying in 5s…`, true);
      clearTimeout(timer);
      timer = setTimeout(save, 5000);
      return false;
    }
  }

  // queue a save; resolves once it (and every save before it) has finished
  function save() {
    queue = queue.then(doSave);
    return queue;
  }

  // debounce - save 1s after the last keystroke
  form.addEventListener('input', () => {
    dirty = true;
    setStatus('Unsaved changes…');
    clearTimeout(timer);
    timer = setTimeout(save, 1000);
  });

  // leaving the page within that 1s? send the last changes anyway. keepalive lets the
  // request finish even after the tab is gone.
  window.addEventListener('pagehide', () => {
    if (dirty) request(true).catch(() => {});
  });

  // "submit for review" must send the latest text first, then submit
  if (submitForm) {
    submitForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearTimeout(timer);
      const ok = await save();
      if (ok && articleId) submitForm.submit(); // .submit() doesn't fire this listener again
    });
  }
}

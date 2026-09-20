// public/js/comments.js
// Post a comment with fetch() and add it without reloading the page, plus edit/delete:
// a commenter can edit or delete comments they posted (this session); an editor can delete any.
// DOM is built with textContent (never innerHTML from user input) to avoid XSS.
(function () {
  const section = document.getElementById('comments');
  if (!section) return;

  const articleId = section.dataset.articleId;
  const form = document.getElementById('comment-form');
  const list = document.getElementById('comment-list');
  const message = document.getElementById('comment-message');
  const countEl = document.getElementById('comment-count');

  function showMessage(text, isError) {
    message.textContent = text;
    message.classList.toggle('form-message--error', !!isError);
  }
  function bumpCount(delta) {
    if (countEl) countEl.textContent = String(Math.max(0, (parseInt(countEl.textContent, 10) || 0) + delta));
  }

  // Build a comment <li>. `owned` = this visitor can edit/delete it (they just posted it).
  function renderComment(c, owned) {
    const li = document.createElement('li');
    li.className = 'comment';
    li.dataset.commentId = c._id;

    const meta = document.createElement('div');
    meta.className = 'comment__meta';

    const author = document.createElement('span');
    author.className = 'comment__author';
    author.textContent = c.author;

    const time = document.createElement('time');
    time.className = 'comment__time';
    const created = new Date(c.createdAt);
    time.dateTime = created.toISOString();
    time.textContent = created.toLocaleString('en-GB');
    meta.append(author, time);

    if (owned) {
      const actions = document.createElement('span');
      actions.className = 'comment__actions';
      const edit = document.createElement('button');
      edit.type = 'button'; edit.className = 'comment__action'; edit.dataset.edit = ''; edit.textContent = 'Edit';
      const del = document.createElement('button');
      del.type = 'button'; del.className = 'comment__action comment__action--del'; del.dataset.delete = ''; del.textContent = 'Delete';
      actions.append(edit, del);
      meta.append(actions);
    }

    const body = document.createElement('p');
    body.className = 'comment__body';
    body.textContent = c.body;

    li.append(meta, body);
    return li;
  }

  // ---- Post a new comment ----
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    showMessage('', false);

    const author = form.author.value.trim();
    const body = form.body.value.trim();
    if (!author || !body) { showMessage('Please fill in both fields.', true); return; }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      const res = await fetch(`/api/articles/${articleId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author, body }),
      });
      const data = await res.json();
      if (!res.ok) { showMessage(data.error || 'Could not post comment.', true); return; }

      const empty = document.getElementById('comment-empty');
      if (empty) empty.remove();
      list.prepend(renderComment(data, true)); // we posted it, so we can edit/delete it
      bumpCount(1);
      form.reset();
      showMessage('Comment posted.', false);
    } catch (err) {
      showMessage('Network error. Please try again.', true);
    } finally {
      submitBtn.disabled = false;
    }
  });

  // ---- Edit / delete existing comments (event delegation covers server- and ajax-rendered items) ----
  list.addEventListener('click', async function (e) {
    const li = e.target.closest('.comment');
    if (!li) return;
    const id = li.dataset.commentId;

    // Delete
    if (e.target.matches('[data-delete]')) {
      if (!window.confirm('Delete this comment?')) return;
      try {
        const res = await fetch(`/api/comments/${id}`, { method: 'DELETE' });
        if (!res.ok) { const d = await res.json().catch(() => ({})); window.alert(d.error || 'Could not delete.'); return; }
        li.remove();
        bumpCount(-1);
      } catch (_) { window.alert('Network error. Please try again.'); }
      return;
    }

    // Edit — swap the body text for a small inline editor
    if (e.target.matches('[data-edit]')) {
      const bodyP = li.querySelector('.comment__body');
      if (!bodyP || li.querySelector('.comment-edit')) return; // already editing

      const editor = document.createElement('div');
      editor.className = 'comment-edit';
      const ta = document.createElement('textarea');
      ta.className = 'field__input'; ta.rows = 3; ta.maxLength = 1000; ta.value = bodyP.textContent;
      const row = document.createElement('div'); row.className = 'comment-edit__actions';
      const save = document.createElement('button');
      save.type = 'button'; save.className = 'btn btn--primary btn--sm'; save.textContent = 'Save';
      const cancel = document.createElement('button');
      cancel.type = 'button'; cancel.className = 'btn btn--secondary btn--sm'; cancel.textContent = 'Cancel';
      row.append(save, cancel);
      editor.append(ta, row);
      bodyP.style.display = 'none';
      bodyP.after(editor);
      ta.focus();

      cancel.addEventListener('click', () => { editor.remove(); bodyP.style.display = ''; });
      save.addEventListener('click', async () => {
        const newBody = ta.value.trim();
        if (!newBody) { ta.focus(); return; }
        save.disabled = true;
        try {
          const res = await fetch(`/api/comments/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ body: newBody }),
          });
          const d = await res.json();
          if (!res.ok) { window.alert(d.error || 'Could not save.'); save.disabled = false; return; }
          bodyP.textContent = d.body;
          editor.remove(); bodyP.style.display = '';
        } catch (_) { window.alert('Network error. Please try again.'); save.disabled = false; }
      });
    }
  });
})();

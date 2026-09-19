// public/js/comments.js — [WORKED EXAMPLE ✅]
//
// Posts a new comment with fetch() and adds it to the list WITHOUT reloading the page or the
// whole list (a spec requirement). This is the client-side Ajax pattern you'll reuse for the
// feed (search/filter/sort/infinite scroll) and elsewhere.
//
// Key ideas to copy:
//   - progressive enhancement: the form has a real action; JS just improves it
//   - always build DOM with textContent (never innerHTML from user input) to avoid XSS
//   - handle non-2xx responses and show the server's message (e.g. the 429 rate-limit message)
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

  function renderComment(c) {
    const li = document.createElement('li');
    li.className = 'comment';

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

    const body = document.createElement('p');
    body.className = 'comment__body';
    body.textContent = c.body;

    li.append(meta, body);
    return li;
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    showMessage('', false);

    const author = form.author.value.trim();
    const body = form.body.value.trim();
    if (!author || !body) {
      showMessage('Please fill in both fields.', true);
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      const res = await fetch(`/api/articles/${articleId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author, body }),
      });
      const data = await res.json();

      if (!res.ok) {
        // e.g. 429 rate-limited, or 400 validation — show the server's message.
        showMessage(data.error || 'Could not post comment.', true);
        return;
      }

      // Success — drop the empty-state line, prepend the new comment, bump the count.
      const empty = document.getElementById('comment-empty');
      if (empty) empty.remove();
      list.prepend(renderComment(data));
      if (countEl) countEl.textContent = String((parseInt(countEl.textContent, 10) || 0) + 1);
      form.reset();
      showMessage('Comment posted.', false);
    } catch (err) {
      showMessage('Network error. Please try again.', true);
    } finally {
      submitBtn.disabled = false;
    }
  });
})();

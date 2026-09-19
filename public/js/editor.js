// autosave for the reporter edit form
// every time the reporter types something we wait 1 second then send it to the server
// this way they never lose their work even if they close the tab or the power goes out

const form = document.getElementById('article-form');
const articleIdInput = document.getElementById('article-id');
const indicator = document.getElementById('autosave-indicator');

if (form && articleIdInput) {
  const articleId = articleIdInput.value;
  let saveTimeout;

  const inputs = form.querySelectorAll('input, textarea');

  const saveDraft = async () => {
    indicator.textContent = 'Saving...';

    const data = {
      title: document.getElementById('field-title').value,
      category: document.getElementById('field-category').value,
      image: document.getElementById('field-image').value,
      summary: document.getElementById('field-summary').value,
      body: document.getElementById('field-body').value,
    };

    try {
      const res = await fetch(`/reporter/articles/${articleId}/autosave`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        indicator.textContent = `Last saved at ${new Date().toLocaleTimeString()}`;
      } else {
        indicator.textContent = 'Save failed. Retrying soon...';
      }
    } catch (err) {
      console.error('Autosave error:', err);
      indicator.textContent = 'Network error. Will retry...';
    }
  };

  // debounce - only save after user stops typing for a sec
  inputs.forEach(input => {
    input.addEventListener('input', () => {
      indicator.textContent = 'Unsaved changes...';
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(saveDraft, 1000);
    });
  });
}

// fetch weather from our own api endpoint and show it in the sidebar
// the actual openweathermap call happens on the server, never from here
// if something goes wrong we just show a friendly message, no crash

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('weather-body');
  if (!container) return;

  try {
    const res = await fetch('/api/weather');
    if (!res.ok) throw new Error('Weather fetch failed');

    const data = await res.json();

    container.innerHTML = `
      <div style="display: flex; align-items: center; gap: 1rem;">
        <img src="https://openweathermap.org/img/wn/${data.icon}@2x.png" alt="${data.description}" style="width: 50px; height: 50px;">
        <div>
          <strong style="display: block; font-size: 1.5rem; line-height: 1;">${Math.round(data.temp)}°C</strong>
          <span class="meta">${data.city} · <span style="text-transform: capitalize;">${data.description}</span></span>
        </div>
      </div>
    `;
  } catch (err) {
    console.error(err);
    container.innerHTML = `<p class="muted">Weather currently unavailable.</p>`;
  }
});

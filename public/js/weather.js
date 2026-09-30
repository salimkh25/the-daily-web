// fetch the weather from OUR server (/api/weather) and show it in the sidebar.
// the actual openweathermap call (and its api key) stays on the server, never in the browser.
// if something goes wrong we just show a friendly message, the rest of the page keeps working.

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('weather-body');
  if (!container) return;

  try {
    const res = await fetch('/api/weather');
    if (!res.ok) throw new Error(`Weather fetch failed (${res.status})`);
    const data = await res.json();

    const row = document.createElement('div');
    row.className = 'weather__row';

    const icon = document.createElement('img');
    icon.src = `https://openweathermap.org/img/wn/${encodeURIComponent(data.icon)}@2x.png`;
    icon.alt = data.description;
    icon.width = 50;
    icon.height = 50;

    const text = document.createElement('div');
    const temp = document.createElement('strong');
    temp.className = 'weather__temp';
    temp.textContent = `${Math.round(data.temp)}°${data.units === 'imperial' ? 'F' : 'C'}`;
    const desc = document.createElement('span');
    desc.className = 'meta weather__desc';
    desc.textContent = `${data.city} · ${data.description}`;
    text.append(temp, desc);

    row.append(icon, text);
    container.replaceChildren(row);
  } catch (err) {
    console.error(err);
    const msg = document.createElement('p');
    msg.className = 'muted';
    msg.textContent = 'Weather currently unavailable.';
    container.replaceChildren(msg);
  }
});

// stats.js - draws the Impact Analytics chart with Chart.js.
// x axis = real time (so gaps and spacing are honest), y axis = views per hour (or per day),
// and every update the editor published is marked with a dashed vertical line + a triangle,
// so you can see how the views behaved before and after that moment.

(async function () {
  const canvas = document.getElementById('impact-chart');
  const impactList = document.getElementById('impact-list');
  if (!canvas || typeof Chart === 'undefined') return;

  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;
  const RED = '#DC2626';
  const INK = '#0F172A';

  function fmt(ms, withTime) {
    const opts = { day: 'numeric', month: 'short' };
    if (withTime) Object.assign(opts, { hour: '2-digit', minute: '2-digit' });
    return new Date(ms).toLocaleString('en-GB', opts);
  }

  function setList(items) {
    impactList.innerHTML = '';
    items.forEach((node) => impactList.appendChild(node));
  }
  function textItem(text, className) {
    const li = document.createElement('li');
    li.textContent = text;
    if (className) li.className = className;
    return li;
  }

  let data;
  try {
    const res = await fetch(`/api/articles/${canvas.dataset.articleId}/stats`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (err) {
    console.error('Failed to load stats', err);
    setList([textItem('Could not load the statistics. Please refresh the page.', 'form-message form-message--error')]);
    return;
  }

  const perDay = data.interval === 'day';
  const unit = perDay ? 'day' : 'hour';
  const points = data.series.map((p) => ({ x: new Date(p.t).getTime(), y: p.views }));
  const updates = data.updates.map((u) => new Date(u).getTime());

  if (!points.length) {
    canvas.hidden = true;
    document.getElementById('chart-empty').hidden = false;
    setList([textItem('No views yet, so there is nothing to compare.', 'muted')]);
    return;
  }

  // views at (or right before) a moment - used to place the ▲ on the line
  function viewsAt(ms) {
    let value = 0;
    for (const p of points) {
      if (p.x > ms) break;
      value = p.y;
    }
    return value;
  }

  // draws a dashed vertical line + "Update N" label at each update (tiny inline plugin, no extra library)
  const updateLines = {
    id: 'updateLines',
    afterDatasetsDraw(chart) {
      const { ctx, chartArea, scales } = chart;
      ctx.save();
      updates.forEach((ms, i) => {
        const x = scales.x.getPixelForValue(ms);
        if (x < chartArea.left || x > chartArea.right) return;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(x, chartArea.top);
        ctx.lineTo(x, chartArea.bottom);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = INK;
        ctx.font = '600 12px system-ui, sans-serif';
        ctx.textAlign = x > chartArea.right - 70 ? 'right' : 'left';
        ctx.fillText(`Update ${i + 1}`, x + (ctx.textAlign === 'left' ? 6 : -6), chartArea.top + 14);
      });
      ctx.restore();
    },
  };

  new Chart(canvas, {
    type: 'line',
    data: {
      datasets: [
        {
          label: `Views per ${unit}`,
          data: points,
          borderColor: RED,
          backgroundColor: 'rgba(220, 38, 38, 0.10)',
          fill: true,
          tension: 0.25,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2,
        },
        {
          type: 'scatter',
          label: 'Editor published an update',
          data: updates.map((ms) => ({ x: ms, y: viewsAt(ms) })),
          pointStyle: 'triangle',
          pointRadius: 9,
          pointHoverRadius: 11,
          backgroundColor: INK,
          borderColor: '#fff',
          borderWidth: 1.5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'nearest', intersect: false },
      scales: {
        x: {
          type: 'linear',
          min: points[0].x,
          max: Math.max(points[points.length - 1].x, ...updates),
          ticks: { maxTicksLimit: 8, callback: (v) => fmt(v, !perDay) },
          title: { display: true, text: 'Time' },
        },
        y: {
          beginAtZero: true,
          ticks: { precision: 0 },
          title: { display: true, text: `Views per ${unit}` },
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            title: (items) => fmt(items[0].parsed.x, true),
            label: (item) => (item.datasetIndex === 1
              ? `Update ${item.dataIndex + 1} published`
              : `${item.parsed.y} views`),
          },
        },
      },
    },
    plugins: [updateLines],
  });

  // ---- before vs after: average views per hour/day in the window before and after each update ----
  const WINDOW = perDay ? 3 * DAY : 24 * HOUR;
  const windowLabel = perDay ? '3 days' : '24h';

  function average(from, to) {
    const inside = points.filter((p) => p.x >= from && p.x < to);
    if (!inside.length) return null;
    return inside.reduce((sum, p) => sum + p.y, 0) / inside.length;
  }

  if (!updates.length) {
    setList([textItem('This article has not been updated since it was published.', 'muted')]);
    return;
  }

  setList(updates.map((ms, i) => {
    const before = average(ms - WINDOW, ms);
    const after = average(ms, ms + WINDOW);
    const li = document.createElement('li');
    li.className = 'impact-list__item';

    const head = document.createElement('strong');
    head.textContent = `Update ${i + 1} · ${fmt(ms, true)}`;
    li.appendChild(head);

    const detail = document.createElement('span');
    if (before === null || after === null) {
      detail.textContent = `not enough views ${before === null ? 'before' : 'after'} this update to compare`;
    } else {
      const change = before === 0 ? null : Math.round(((after - before) / before) * 100);
      detail.textContent = `avg ${before.toFixed(1)} views/${unit} in the ${windowLabel} before → ${after.toFixed(1)} after`;
      if (change !== null) {
        const badge = document.createElement('span');
        badge.className = `impact-change ${change >= 0 ? 'impact-change--up' : 'impact-change--down'}`;
        badge.textContent = `${change >= 0 ? '+' : ''}${change}%`;
        detail.append(' ', badge);
      }
    }
    li.appendChild(detail);
    return li;
  }));
})();

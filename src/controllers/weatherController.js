// Node has a global fetch() built in (Node 18+), so no package/require is needed.
let cache = {
  data: null,
  timestamp: 0
};

const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes

async function current(req, res, next) {
  try {
    const now = Date.now();
    if (cache.data && now - cache.timestamp < CACHE_DURATION_MS) {
      return res.json(cache.data);
    }

    const apiKey = process.env.WEATHER_API_KEY;
    const city = process.env.WEATHER_CITY || 'Haifa';
    const units = process.env.WEATHER_UNITS || 'metric';

    if (!apiKey) {
      return res.status(500).json({ error: 'Weather API key missing' });
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=${units}&appid=${apiKey}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OpenWeatherMap returned ${response.status}`);
    }
    
    const data = await response.json();
    
    cache.data = {
      temp: data.main.temp,
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      city: data.name
    };
    cache.timestamp = now;

    res.json(cache.data);
  } catch (err) {
    console.error('Weather fetch error:', err);
    // Graceful fallback
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to fetch weather' });
  }
}

module.exports = {
  current
};

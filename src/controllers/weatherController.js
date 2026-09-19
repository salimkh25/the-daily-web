// weather widget - we proxy the openweathermap api from the server
// so we never expose our api key to the browser
// also we cache the result for 15 min so we dont hammer the free tier
// node has fetch built in now so we dont need the node-fetch package

// simple in-memory cache, just an object with the data and when we last fetched
let cache = {
  data: null,
  timestamp: 0
};

const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes

async function current(req, res, next) {
  try {
    const now = Date.now();

    // if we have cached data thats still fresh, just return that
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

    // store only what we need, dont send the whole api response to the client
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
    // if api is down but we have old data, use that instead of crashing
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to fetch weather' });
  }
}

module.exports = {
  current
};

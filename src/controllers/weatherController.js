// weather widget - we proxy OpenWeatherMap from the server so the api key never reaches the browser,
// and cache the answer for 15 minutes (the spec allows the weather to be up to 15 min old).
// with thousands of readers that's ~4 calls an hour to the free api instead of one per page view.
// node has fetch built in now so we dont need the node-fetch package

const logger = require('../utils/logger');

const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const RETRY_AFTER_FAILURE_MS = 60 * 1000; // if the api is down, don't hit it on every page view

let cache = { data: null, timestamp: 0 };
let inFlight = null;  // when the cache expires and 500 requests arrive at once, they share ONE api call
let lastFailure = 0;

const FALLBACK_CITY = 'Haifa';

function callApi(location, units, apiKey) {
  const url = `https://api.openweathermap.org/data/2.5/weather?${location}&units=${encodeURIComponent(units)}&appid=${apiKey}`;
  return fetch(url, { signal: AbortSignal.timeout(5000) }); // don't hang forever
}

async function fetchWeather() {
  const apiKey = process.env.WEATHER_API_KEY;
  if (!apiKey) throw new Error('WEATHER_API_KEY is not set in .env');

  const city = process.env.WEATHER_CITY || FALLBACK_CITY;
  const units = process.env.WEATHER_UNITS || 'metric';
  const { WEATHER_LAT: lat, WEATHER_LON: lon } = process.env;
  const useCoords = Boolean(lat && lon); // for places openweathermap doesn't know by name

  let response = await callApi(useCoords ? `lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}` : `q=${encodeURIComponent(city)}`, units, apiKey);
  // unknown city name -> show Haifa rather than nothing
  if (response.status === 404 && !useCoords && city !== FALLBACK_CITY) {
    logger.warn(`Weather: "${city}" not found by OpenWeatherMap, using ${FALLBACK_CITY}`);
    response = await callApi(`q=${FALLBACK_CITY}`, units, apiKey);
  }
  if (!response.ok) throw new Error(`OpenWeatherMap returned ${response.status}`);
  const data = await response.json();

  // keep only what the widget needs, dont send the whole api response to the client
  return {
    temp: data.main.temp,
    description: data.weather[0].description,
    icon: data.weather[0].icon,
    city: useCoords ? city : data.name, // coordinates come back named after the nearest station
    units,
  };
}

// GET /api/weather
async function current(req, res) {
  const now = Date.now();

  // fresh enough -> answer from memory
  if (cache.data && now - cache.timestamp < CACHE_DURATION_MS) {
    return res.json(cache.data);
  }
  // it just failed, give the api a minute before trying again
  if (now - lastFailure < RETRY_AFTER_FAILURE_MS) {
    return res.status(503).json({ error: 'Weather is unavailable right now' });
  }

  try {
    if (!inFlight) inFlight = fetchWeather().finally(() => { inFlight = null; });
    const data = await inFlight;
    cache = { data, timestamp: Date.now() };
    res.json(data);
  } catch (err) {
    lastFailure = Date.now();
    logger.error('Weather fetch failed:', err.message);
    // older than 15 min would break the spec's freshness rule, so no stale fallback - the widget says "unavailable"
    res.status(503).json({ error: 'Weather is unavailable right now' });
  }
}

module.exports = {
  current,
};

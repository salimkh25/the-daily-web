// comment rate limit: a guest may post at most 3 comments per minute from the same device.
// the SERVER enforces it and answers 429 with a clear message (hiding a button isn't enforcement).
//
// simple in-memory sliding window, no library: per ip we keep the times of recent comments and
// refuse once there are `max` of them inside `windowMs`.
// limitation: the map resets on restart and isn't shared between several server processes -
// to scale it out you'd keep the same keys in a shared store (a small mongo collection or redis).
const logger = require('../utils/logger');

const hits = new Map(); // identifier -> number[] (timestamps in ms)

function createRateLimiter({ windowMs = 60_000, max = 3 } = {}) {
  return function rateLimiter(req, res, next) {
    // Identify the "device". Behind a proxy you'd trust X-Forwarded-For; here req.ip is fine.
    const id = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    const recent = (hits.get(id) || []).filter((t) => now - t < windowMs);

    if (recent.length >= max) {
      const retryMs = windowMs - (now - recent[0]);
      logger.warn(`Rate limit hit for ${id} on ${req.originalUrl}`);
      res.set('Retry-After', Math.ceil(retryMs / 1000));
      return res.status(429).json({
        error: `Too many comments. Please wait ${Math.ceil(retryMs / 1000)}s and try again.`,
      });
    }

    recent.push(now);
    hits.set(id, recent);
    next();
  };
}

// Occasionally clear out old entries so the map doesn't grow forever.
setInterval(() => {
  const now = Date.now();
  for (const [id, times] of hits) {
    const live = times.filter((t) => now - t < 60_000);
    if (live.length) hits.set(id, live);
    else hits.delete(id);
  }
}, 5 * 60_000).unref();

module.exports = createRateLimiter;

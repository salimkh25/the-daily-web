// src/middleware/rateLimit.js — [WORKED EXAMPLE ✅ fully implemented]
//
// The spec: a guest may post at most 3 comments per minute from the same device, and the
// SERVER must enforce it (hiding a button on the client is not enforcement). Exceeding it
// returns a clear message.
//
// This is a simple in-memory sliding-window limiter — no external library. It keeps, per
// identifier, the timestamps of recent hits and rejects once there are `max` within `windowMs`.
//
// Note for the defense: an in-memory map resets on server restart and isn't shared across
// multiple server processes. That's fine for this project; if asked how you'd scale it, the
// answer is a shared store (e.g. a small MongoDB collection or Redis) keyed the same way.
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

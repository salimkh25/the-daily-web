// src/middleware/errorHandler.js — central error handling + 404. [PLUMBING — written for you]
//
// Mounted LAST in server.js. The spec requires that bad data / unauthorized actions never
// crash the server, and that errors are logged. Everything funnels through here.
const logger = require('../utils/logger');

// 404 — nothing matched. Mount this AFTER all routes, BEFORE errorHandler.
function notFound(req, res, next) {
  res.status(404);
  if (req.accepts('html')) {
    return res.render('error', { status: 404, message: 'Page not found' });
  }
  res.json({ error: 'Not found' });
}

// Central error handler. Any `next(err)` or thrown error in an async handler lands here.
// (Express 4 needs the 4-arg signature to recognise this as an error handler.)
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  logger.error(`${req.method} ${req.originalUrl} -> ${status}`, err.message);

  // Never leak stack traces to the client in production.
  const clientMessage = status < 500 ? err.message : 'Something went wrong on our end.';

  res.status(status);
  if (req.accepts('html')) {
    return res.render('error', { status, message: clientMessage });
  }
  res.json({ error: clientMessage });
}

module.exports = { notFound, errorHandler };

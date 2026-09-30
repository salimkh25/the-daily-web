// 404 + central error handler, mounted last in server.js.
// every next(err) and every error thrown inside a controller ends up here, gets logged,
// and turns into a clean response - bad input or a bad id should never crash the server.
const logger = require('../utils/logger');

// Ajax/API callers get JSON, browsers navigating to a page get the error page.
// (fetch() sends Accept: */* so req.accepts('html') alone can't tell them apart)
function wantsJson(req) {
  return req.originalUrl.startsWith('/api') || req.is('json') || !req.accepts('html');
}

// nothing matched the url
function notFound(req, res) {
  res.status(404);
  if (wantsJson(req)) return res.json({ error: 'Not found' });
  res.render('error', { status: 404, message: 'Page not found' });
}

function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message;

  // "/articles/abc" -> mongoose can't cast "abc" to an ObjectId. that id can't exist, so 404.
  if (err.name === 'CastError') {
    status = 404;
    message = 'Not found';
  }
  // schema validation failed (too long title etc) -> the client sent bad data, 400
  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors)[0].message;
  }

  // real failures go to logs/error.log, client mistakes (4xx) are just a warning in the console
  const log = status >= 500 ? logger.error : logger.warn;
  log(`${req.method} ${req.originalUrl} -> ${status}`, err.message);

  // never leak internals (stack traces, db messages) on a real server error
  const clientMessage = status < 500 ? message : 'Something went wrong on our end.';

  res.status(status);
  if (wantsJson(req)) return res.json({ error: clientMessage });
  res.render('error', { status, message: clientMessage });
}

module.exports = { notFound, errorHandler, wantsJson };

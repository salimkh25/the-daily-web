// src/utils/logger.js — tiny logger. [PLUMBING — written for you]
//
// The spec requires logging errors and significant operational events. This keeps it
// dependency-free: timestamped lines to the console, and errors also appended to logs/error.log.
const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', '..', 'logs');
try { fs.mkdirSync(LOG_DIR, { recursive: true }); } catch (_) { /* ignore */ }

function line(level, args) {
  const ts = new Date().toISOString();
  const msg = args
    .map((a) => (typeof a === 'string' ? a : JSON.stringify(a)))
    .join(' ');
  return `[${ts}] ${level.toUpperCase()} ${msg}`;
}

const logger = {
  info(...args) { console.log(line('info', args)); },
  warn(...args) { console.warn(line('warn', args)); },
  error(...args) {
    const out = line('error', args);
    console.error(out);
    try { fs.appendFileSync(path.join(LOG_DIR, 'error.log'), out + '\n'); } catch (_) { /* ignore */ }
  },
};

module.exports = logger;

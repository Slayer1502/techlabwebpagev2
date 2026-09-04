const config = require("../../config");

const rateLimiter = new Map();
const RATE_LIMIT_WINDOW_MS = config.RATE_LIMIT_WINDOW_MS;
const RATE_LIMIT_MAX = config.RATE_LIMIT_MAX;

const cleanRateLimiter = () => {
  const now = Date.now();
  for (const [key, record] of rateLimiter) {
    if (now - record.firstTry > RATE_LIMIT_WINDOW_MS) {
      rateLimiter.delete(key);
    }
  }
};
setInterval(cleanRateLimiter, RATE_LIMIT_WINDOW_MS);

const checkRateLimit = (key, max = RATE_LIMIT_MAX) => {
  const now = Date.now();
  const record = rateLimiter.get(key) || { count: 0, firstTry: now };
  if (now - record.firstTry > RATE_LIMIT_WINDOW_MS) {
    record.count = 0;
    record.firstTry = now;
  }
  record.count++;
  rateLimiter.set(key, record);
  return record.count <= max;
};

module.exports = { checkRateLimit };

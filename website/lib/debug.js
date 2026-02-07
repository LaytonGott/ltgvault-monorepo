const isDev = process.env.NODE_ENV !== 'production';

function debugLog(label, ...args) {
  if (isDev) console.log(`[${label}]`, ...args);
}

module.exports = { debugLog };

const pino = require('pino');

const isProd = process.env.NODE_ENV === 'production';
const level = process.env.LOG_LEVEL || (isProd ? 'info' : 'debug');

const logger = pino({
  level,
  base: null,
  timestamp: pino.stdTimeFunctions.isoTime
});

const passThrough = (args) => {
  if (args.length === 0) return '';
  if (args.length === 1) return args[0];
  return { args };
};

const originalConsole = { ...console };

console.log = (...args) => logger.info(passThrough(args));
console.info = (...args) => logger.info(passThrough(args));
console.warn = (...args) => logger.warn(passThrough(args));
console.error = (...args) => logger.error(passThrough(args));
console.debug = (...args) => logger.debug(passThrough(args));

module.exports = { logger, originalConsole };

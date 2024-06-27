// logger.ts

import winston from 'winston';
import chalk from 'chalk';

// Define custom log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  text: 2,
  debug: 3,
  verbose: 4,
};

// Create color scheme for log levels
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  text: 'green',
  debug: 'blue',
  verbose: 'cyan',
};

// Create Winston logger instance
const logger = winston.createLogger({
  levels: logLevels,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, service }) => {
      const color = logColors[level] || 'white';
      return `${chalk.gray(timestamp)} ${chalk[color](level.toUpperCase())} [${service}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Create a function to dynamically enable/disable log levels
function setLogLevel(level: string) {
  logger.level = level;
}

// Create a function to enable/disable specific services
const enabledServices = new Set<string>();

function toggleService(service: string, enabled: boolean) {
  if (enabled) {
    enabledServices.add(service);
  } else {
    enabledServices.delete(service);
  }
}

// Create a wrapper function for logging
function log(level: string, message: string, service: string) {
  if (enabledServices.has(service) || enabledServices.size === 0) {
    logger.log({ level, message, service });
  }
}

export { logger, setLogLevel, toggleService, log };
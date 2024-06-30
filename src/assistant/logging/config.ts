// config.ts
import winston from 'winston';

export const loggingConfig = {
  console: {
    level: 'info',
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  },
  file: {
    level: 'debug',
    filename: 'app.log',
    format: winston.format.json()
  },
  ui: {
    level: 'info'
  }
};
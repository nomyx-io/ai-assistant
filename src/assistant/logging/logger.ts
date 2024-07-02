// logger.ts
import winston from 'winston';
import chalk from 'chalk';
import { loggingConfig } from './config';
import boxen from 'boxen';

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

export class LoggingService {
  private logger: winston.Logger;
  private logLevels = logLevels;
  private enabled = true;

  constructor() {
    this.logger = winston.createLogger({
      level: 'error', // Change default level to debug for more logging
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          level: 'error', // Change console level to debug
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
            winston.format.printf(({ level, message, timestamp }) => {
              return `${chalk.gray(timestamp)} ${level}: ${message}`;
            })
          )
        }),
        new winston.transports.File(loggingConfig.file),
      ]
    });
  }

  toggleService(service: string, enable: boolean): void {
    if (enable) {
      this.logger.transports.forEach((transport: winston.transport) => {
        if ((transport as any).name === service) {
          transport.silent = false;
        }
      });
    } else {
      this.logger.transports.forEach((transport: winston.transport) => {
        if ((transport as any).name === service) {
          transport.silent = true;
        }
      });
    }
  }

  boxedOutput(message: string, level: string = 'info'): void {
    const boxedMessage = boxen(message, {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: level === 'error' ? 'red' : level === 'warn' ? 'yellow' : 'green'
    });
    this.log(level, boxedMessage);
  }

  log(level: string, message: string, meta?: any): void {
    this.logger.log(level, message, meta);
  }

  error(message: string, error: Error, meta?: any): void {
    this.logger.error(message, { error, ...meta });
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  setLogLevel(level: string): void {
    this.logger.level = level;
    this.logger.info(`Log level changed to: ${level}`);
  }

  addTransport(transport: winston.transport): void {
    this.logger.add(transport);
  }

  removeTransport(transport: winston.transport): void {
    this.logger.remove(transport);
  }
}

export const loggingService = new LoggingService();

// Add this function to maintain compatibility
export function log(level: string, message: string, service?: string): void {
  loggingService.log(level, message, { service });
}
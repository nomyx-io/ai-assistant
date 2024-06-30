// uiLogger.ts
import Transport from 'winston-transport';
import { EnhancedUI } from './ui';

interface UILoggerOptions extends Transport.TransportStreamOptions {
  ui: EnhancedUI;
}

export class UILogger extends Transport {
  private ui: EnhancedUI;

  constructor(options: UILoggerOptions) {
    super(options);
    this.ui = options.ui;
  }

  log(info: any, callback: () => void): void {
    setImmediate(() => {
      this.emit('logged', info);
    });

    this.ui.updateOutput(info.message, info.level);
    callback();
  }
}
import { Global, Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { AppLoggerService } from './logger.service';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(
  ({ level, message, timestamp: ts, context, stack }) => {
    const ctx = context ? ` [${String(context)}]` : '';
    const err = stack ? `\n${String(stack)}` : '';
    return `${String(ts)} ${level}${ctx}: ${String(message)}${err}`;
  },
);

@Global()
@Module({
  imports: [
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          format: combine(
            colorize({ all: true }),
            timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            errors({ stack: true }),
            logFormat,
          ),
        }),
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: combine(
            timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            errors({ stack: true }),
            logFormat,
          ),
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          format: combine(
            timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            errors({ stack: true }),
            logFormat,
          ),
        }),
      ],
    }),
  ],
  providers: [AppLoggerService],
  exports: [AppLoggerService],
})
export class LoggerModule {}

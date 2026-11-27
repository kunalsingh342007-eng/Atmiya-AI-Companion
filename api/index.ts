import type { IncomingMessage, ServerResponse } from 'http';
import { app, logServerError } from '../server.js';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  const route = typeof req?.url === 'string' ? req.url.split('?')[0] : '/api';
  try {
    return app(req as any, res as any);
  } catch (err) {
    logServerError(route, 'FUNCTION_ENTRY_ERROR', err, 500);
    if (res && !res.headersSent && !res.writableEnded) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(
        JSON.stringify({
          error: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred while processing the request.',
        })
      );
    }
  }
}


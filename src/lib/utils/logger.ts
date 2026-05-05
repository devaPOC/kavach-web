interface LogContext { [k: string]: any }

// Simple request ID generator (could be replaced by nanoid/uuid for higher quality)
export function generateRequestId() {
  return 'req_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function base(level: string, message: string, context?: LogContext) {
  const entry = { ts: new Date().toISOString(), level, msg: message, ...context };
  console[level === 'error' ? 'error' : 'log'](JSON.stringify(entry));
}

export const logger = {
  info: (msg: string, ctx?: LogContext) => base('info', msg, ctx),
  warn: (msg: string, ctx?: LogContext) => base('warn', msg, ctx),
  error: (msg: string, ctx?: LogContext) => base('error', msg, ctx)
};

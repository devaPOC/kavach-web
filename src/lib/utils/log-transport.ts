import { auditLogger } from './audit-logger';

export type ExternalSink = {
  name: string;
  send: (event: Record<string, any>) => Promise<void>;
};

let sinks: ExternalSink[] = [];

export function registerSink(sink: ExternalSink) {
  sinks.push(sink);
  auditLogger.info({ message: 'log_sink_registered', sink: sink.name });
}

export function clearSinks() { sinks = []; }

export async function ship(event: Record<string, any>) {
  if (!sinks.length) return;
  await Promise.allSettled(sinks.map(s => s.send(event)));
}

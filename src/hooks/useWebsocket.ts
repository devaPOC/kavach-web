import { useEffect, useRef } from 'react';

type WebSocketEvent = {
  event: string;
  data: any;
};

export function useWebsocket(onEvent: (event: WebSocketEvent) => void) {
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Check if we are running in Vercel (or a non-local environment)
    const isVercel = process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV === 'production';

    if (isVercel) {
      console.log('Running in production/Vercel. Falling back to HTTP polling.');
      
      const pollInterval = setInterval(() => {
        // Emit a generic polling event
        onEvent({ event: 'poll_update', data: null });
      }, 5000); // 5 seconds interval for polling
      
      return () => clearInterval(pollInterval);
    }

    // In dev, connect to localhost WS server.
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('Connected to local WS server');
    };

    ws.current.onmessage = (message) => {
      try {
        const payload = JSON.parse(message.data);
        onEvent(payload);
      } catch (e) {
        console.error('Failed to parse WS message:', e);
      }
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [onEvent]);

  return ws.current;
}

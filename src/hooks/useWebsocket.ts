import { useEffect, useRef } from 'react';

type WebSocketEvent = {
  event: string;
  data: any;
};

export function useWebsocket(onEvent: (event: WebSocketEvent) => void) {
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    // In dev, connect to localhost:8080.
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

export async function broadcastUpdate(event: string, data: any) {
  try {
    const wsUrl = process.env.WS_BROADCAST_URL || 'http://localhost:8080/broadcast';
    await fetch(wsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ event, data }),
    });
  } catch (e) {
    console.error('Failed to broadcast via local WS server', e);
  }
}

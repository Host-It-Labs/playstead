import { io, type Socket } from 'socket.io-client';
import type { SocketAck } from '../types';

let socket: Socket | null = null;

export function getSocket(token: string): Socket {
  if (!socket) {
    const configuredUrl = import.meta.env.VITE_SOCKET_URL?.trim();
    socket = io(configuredUrl || undefined, {
      path: '/socket.io',
      autoConnect: false,
      auth: { token },
      transports: ['websocket', 'polling'],
    });
  }

  socket.auth = { token };
  if (!socket.connected) socket.connect();
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

export async function emitWithAck<T = undefined>(
  activeSocket: Socket,
  event: string,
  payload: unknown,
): Promise<T | undefined> {
  const acknowledgement = (await activeSocket
    .timeout(8000)
    .emitWithAck(event, payload)) as SocketAck<T>;
  if (!acknowledgement.ok) throw new Error(acknowledgement.error.message);
  return 'data' in acknowledgement ? acknowledgement.data : undefined;
}

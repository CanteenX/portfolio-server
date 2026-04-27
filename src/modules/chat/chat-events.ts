import type { Response } from "express";

type SSEClient = {
  res: Response;
  userId: string;
  conversationId: string;
};

const clients: SSEClient[] = [];

export function addClient(client: SSEClient): void {
  clients.push(client);
}

export function removeClient(res: Response): void {
  const idx = clients.findIndex((c) => c.res === res);
  if (idx !== -1) clients.splice(idx, 1);
}

export function broadcastToConversation(
  conversationId: string,
  event: string,
  data: unknown
): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    if (client.conversationId === conversationId) {
      client.res.write(payload);
    }
  }
}

export function getClientCount(conversationId: string): number {
  return clients.filter((c) => c.conversationId === conversationId).length;
}

import type {
  WebSocketConnectionEvent,
  WebSocketDisconnectionEvent,
} from "#vendor/types/types.js";

export const wsPresenceService = {
  async onUserConnected(_event: WebSocketConnectionEvent): Promise<void> {},
  async onUserDisconnected(_event: WebSocketDisconnectionEvent): Promise<void> {},
};

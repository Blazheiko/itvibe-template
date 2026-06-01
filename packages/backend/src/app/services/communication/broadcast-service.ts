import logger from "#logger";
import { broadcastToChannel } from "#vendor/start/server.js";
import { makeBroadcastJson } from "#vendor/utils/helpers/json-handlers.js";
import { wsConnectionRegistry } from "#app/websocket/ws-connection-registry.js";
import type { Payload } from "#vendor/types/types.js";

export const broadcastService = {
  broadcastMessageToUser(
    userId: string,
    event: string,
    payload: Payload,
  ): number {
    logger.info(`broadcastMessageToUser: ${userId} ${event}`);
    let counter = 0;
    wsConnectionRegistry.forEachConnection(userId, (userConnection) => {
      try {
        const result = userConnection.send(
          makeBroadcastJson(event, 200, payload),
        );
        if (result === 1) counter++;
      } catch (error) {
        logger.warn({ err: error }, `Error sending message to user ${userId}`);
      }
    });
    return counter;
  },

  broadcastMessageToUserExcept(
    userId: string,
    excludeUuid: string,
    event: string,
    payload: Payload,
  ): number {
    logger.info(
      `broadcastMessageToUserExcept: ${userId} ${event} exclude: ${excludeUuid}`,
    );
    let counter = 0;
    wsConnectionRegistry.forEachConnection(userId, (userConnection, uuid) => {
      if (uuid === excludeUuid) return;
      try {
        const result = userConnection.send(
          makeBroadcastJson(event, 200, payload),
        );
        if (result === 1) counter++;
      } catch (error) {
        logger.warn({ err: error }, `Error sending message to user ${userId}`);
      }
    });
    return counter;
  },

  broadcastMessageToUserConnection(
    userId: string,
    targetUuid: string,
    event: string,
    payload: Payload,
  ): number {
    logger.info(
      `broadcastMessageToUserConnection: ${userId} ${event} target: ${targetUuid}`,
    );
    const connection = wsConnectionRegistry.getConnection(userId, targetUuid);
    if (connection === undefined) {
      logger.warn(
        `Target WS connection not found for user ${userId}: ${targetUuid}`,
      );
      return 0;
    }
    try {
      const result = connection.send(makeBroadcastJson(event, 200, payload));
      return result === 1 ? 1 : 0;
    } catch (error) {
      logger.warn(
        { err: error },
        `Error sending message to target connection ${targetUuid}`,
      );
      return 0;
    }
  },

  broadcastMessageToChannel(
    channel: string,
    event: string,
    payload: Payload,
  ): void {
    logger.info(`broadcastMessageToChannel: ${channel} ${event}`);
    broadcastToChannel(channel, event, payload);
  },
};

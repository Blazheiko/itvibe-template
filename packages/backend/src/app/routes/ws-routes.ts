import AdminWsController from "#app/controllers/ws/admin-ws-controller.js";
import SupportWsController from "#app/controllers/ws/support-controller.js";
import { defineWsRoute } from "#app/routing/define-ws-route.js";
import {
  SupportChatInputSchema,
  SupportOpenChatInputSchema,
} from "shared/schemas";
import * as ResponseSchemas from "shared/responses";

export default [
  {
    group: [
      defineWsRoute({
        url: "subscribe_online_users",
        handler: AdminWsController.subscribeOnlineUsers.bind(AdminWsController),
        description: "Subscribe current admin websocket to admin online updates",
      }),
      defineWsRoute({
        url: "unsubscribe_online_users",
        handler: AdminWsController.unsubscribeOnlineUsers.bind(AdminWsController),
        description: "Unsubscribe current admin websocket from admin online updates",
      }),
    ],
    prefix: "admin",
    description: "Admin websocket routes",
    rateLimit: { windowMs: 60_000, maxRequests: 120 },
  },
  {
    group: [
      defineWsRoute({
        url: "support_open_chat",
        handler: SupportWsController.openChat.bind(SupportWsController),
        validator: SupportOpenChatInputSchema,
        ResponseSchema: ResponseSchemas.SupportOpenChatResponseSchema,
        description: "Open support chat and trigger first greeting",
      }),
      defineWsRoute({
        url: "support_chat",
        handler: SupportWsController.chat.bind(SupportWsController),
        validator: SupportChatInputSchema,
        ResponseSchema: ResponseSchemas.SupportChatResponseSchema,
        description: "Send a message to the support agent",
      }),
    ],
    prefix: "support",
    description: "Support agent routes",
    rateLimit: { windowMs: 60_000, maxRequests: 60 },
  },
];

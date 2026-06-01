import { Result } from "better-result";
import type { MyWebSocket } from "#vendor/types/types.js";
import { describe, expect, it, vi } from "vitest";
import { adminWsChannelService } from "./admin-ws-channel-service.js";

function createWs(role: "admin" | "user") {
  const userData = {
    role,
    isAdminChannelSubscribed: false,
  };
  const subscribe = vi.fn();
  const unsubscribe = vi.fn();
  const ws = {
    getUserData: vi.fn(() => userData),
    subscribe,
    unsubscribe,
  } as unknown as MyWebSocket;

  return { ws, subscribe, unsubscribe };
}

describe("adminWsChannelService", () => {
  it("returns forbidden for non-admin users", () => {
    const { ws } = createWs("user");

    const result = adminWsChannelService.subscribeCurrentAdminConnection(ws);

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.error).toEqual({
        _tag: "Forbidden",
        message: "Access denied",
      });
    }
  });

  it("subscribes admin users to the admin channel", () => {
    const { ws, subscribe } = createWs("admin");

    const result = adminWsChannelService.subscribeCurrentAdminConnection(ws);

    expect(Result.isOk(result)).toBe(true);
    expect(subscribe).toHaveBeenCalledWith("admin");
  });
});

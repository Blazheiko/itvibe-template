import { type } from "@arktype/type";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { defineWsRoute } from "#app/routing/define-ws-route.js";

const executeMiddlewaresMock = vi.fn();
const checkRateLimitWsMock = vi.fn();

vi.mock("#vendor/utils/middlewares/core/execute-httpMiddlewares.js", () => ({
  default: executeMiddlewaresMock,
}));

vi.mock("../rate-limit/ws-rate-limit.js", () => ({
  default: checkRateLimitWsMock,
  createWsRateLimitErrorResponse: vi.fn(),
}));

describe("ws-api-dispatcher validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    executeMiddlewaresMock.mockResolvedValue(true);
    checkRateLimitWsMock.mockReturnValue({ allowed: true });
  });

  it("returns 422 and does not call handler for invalid WS payload", async () => {
    const handler = vi.fn();
    const route = defineWsRoute({
      url: "event_typing",
      validator: type({
        roomId: "string",
      }),
      handler,
    });

    const wsApiDispatcher = (await import("./ws-api-dispatcher.js")).default;
    const result = await wsApiDispatcher(
      {
        event: "event_typing",
        timestamp: Date.now(),
        payload: {
          roomId: 123,
        },
      },
      {
        getUserData: () => ({
          token: "",
        }),
      } as never,
      {
        token: "",
      } as never,
      {} as never,
      {
        [route.url]: route,
      },
    );

    expect(result).toMatchObject({
      status: "error",
      error: {
        code: "validation_failed",
        message: "Validation failure",
      },
    });
    expect(handler).not.toHaveBeenCalled();
  });
});

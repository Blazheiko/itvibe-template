import { describe, expect, it } from "vitest";
import { appErrorToWsError } from "./ws-error.js";
import { APP_ERROR_CASES } from "./app-error-samples.js";

type AppErrorCase = (typeof APP_ERROR_CASES)[number];

describe("ws-error", () => {
  it.each(APP_ERROR_CASES)(
    "serializes %s for websocket clients",
    ({ error }: AppErrorCase) => {
      const wsPayload = appErrorToWsError(error);

      expect(wsPayload).toEqual({
        status: "error",
        message:
          error._tag === "Internal" ? error.publicMessage : error.message,
        code:
          error._tag === "BadRequest"
            ? "bad_request"
            : error._tag === "Unauthorized"
              ? "unauthorized"
              : error._tag === "Forbidden"
                ? "forbidden"
                : error._tag === "NotFound"
                  ? "not_found"
                  : error._tag === "Conflict"
                    ? "conflict"
                    : "internal_error",
        ...("reason" in error && error.reason !== undefined
          ? { reason: error.reason }
          : {}),
      });

      if ("reason" in error && error.reason !== undefined) {
        expect(wsPayload.reason).toBe(error.reason);
      } else {
        expect(wsPayload.reason).toBeUndefined();
      }
    },
  );
});

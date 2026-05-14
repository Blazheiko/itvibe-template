import { describe, expect, it } from "vitest";
import {
  applyAppError,
  applyAppErrorStatus,
  appErrorToHttpPayload,
} from "./apply-service-status.js";
import { appErrorToWsError } from "./ws-error.js";
import { APP_ERROR_CASES } from "./app-error-samples.js";

type AppErrorCase = (typeof APP_ERROR_CASES)[number];

describe("apply-service-status", () => {
  it.each(APP_ERROR_CASES)(
    "maps %s to the expected HTTP status",
    ({ error, status }: AppErrorCase) => {
      const responseData = { status: 200, payload: null } as any;

      applyAppErrorStatus(responseData, error);

      expect(responseData.status).toBe(status);
    },
  );

  it.each(APP_ERROR_CASES)(
    "keeps HTTP and WS payload shapes aligned for %s",
    ({ error, status }: AppErrorCase) => {
      const responseData = { status: 200, payload: null } as any;
      const httpPayload = appErrorToHttpPayload(error);
      const wsPayload = appErrorToWsError(error);

      applyAppError(responseData, error);

      expect(responseData.status).toBe(status);
      expect(responseData.payload).toEqual(httpPayload);
      expect(wsPayload).toEqual(httpPayload);
    },
  );

  it("keeps internal public messages in the payload", () => {
    expect(appErrorToHttpPayload(APP_ERROR_CASES[5].error)).toEqual({
      status: "error",
      message: "Hidden",
      code: "internal_error",
    });
  });
});

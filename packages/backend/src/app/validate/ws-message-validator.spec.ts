import { describe, expectTypeOf, it } from "vitest";

import { wsMessageValidator } from "./ws-message-validator.js";

import type { Validator } from "#vendor/contracts/validator.js";
import type { WsMessage } from "#vendor/types/types.js";

describe("wsMessageValidator", () => {
  it("stays typed as Validator<WsMessage>", () => {
    expectTypeOf(wsMessageValidator).toMatchTypeOf<Validator<WsMessage>>();
  });
});

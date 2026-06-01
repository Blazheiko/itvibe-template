import { ValidationError } from "#app/validate/errors/validation-error.js";
import type { Validator } from "#vendor/contracts/validator.js";

export const validateRoutePayload = <TPayload>(
  validator: Validator<TPayload>,
  payload: unknown,
): TPayload => {
  const out = validator.validate(payload);
  if (!out.ok) {
    throw new ValidationError(out.messages);
  }

  return out.value;
};

import { Result } from "better-result";
import { badRequest, forbidden, unauthorized, type AppResult } from "./errors.js";
import { isCanonicalEntityId } from "#vendor/utils/helpers/entity-id.js";

export function resolveActorAuth(
  requestedUserId: string | undefined,
  sessionUserId: string | undefined,
): AppResult<void> {
  if (requestedUserId !== undefined && !isCanonicalEntityId(requestedUserId)) {
    return Result.err(badRequest("User ID is required"));
  }

  if (!isCanonicalEntityId(sessionUserId)) {
    return Result.err(unauthorized("Session expired"));
  }

  if (
    requestedUserId !== undefined &&
    requestedUserId !== sessionUserId
  ) {
    return Result.err(forbidden("Session does not belong to this user"));
  }

  return Result.ok(undefined);
}

export function resolveResourceOwnership(
  isAllowed: boolean,
  message: string,
): AppResult<void> {
  if (!isAllowed) {
    return Result.err(forbidden(message));
  }
  return Result.ok(undefined);
}

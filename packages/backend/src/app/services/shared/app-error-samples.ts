import {
  badRequest,
  conflict,
  forbidden,
  internal,
  notFound,
  unauthorized,
} from "./errors.js";

export const APP_ERROR_CASES = [
  {
    error: badRequest("Bad", "bad_input"),
    status: 400,
  },
  {
    error: unauthorized(),
    status: 401,
  },
  {
    error: forbidden("Denied", "not_allowed"),
    status: 403,
  },
  {
    error: notFound("User", "Missing"),
    status: 404,
  },
  {
    error: conflict("Already", "duplicate"),
    status: 409,
  },
  {
    error: internal(new Error("boom"), "Hidden"),
    status: 500,
  },
] as const;

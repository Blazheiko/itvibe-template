import type { BodyKind } from "../http-request-handlers.js";

export class UnsupportedMediaTypeError extends Error {
  readonly name = "UnsupportedMediaTypeError";
  readonly code = "unsupported_media_type";
  readonly statusCode = 415;

  constructor(
    public readonly receivedContentType: string,
    public readonly allowedKinds: BodyKind[],
  ) {
    super(
      `Unsupported Content-Type "${receivedContentType}". Allowed: ${allowedKinds.join(", ")}`,
    );
  }
}

// A request body that cannot be parsed. The message never includes the body or
// the parser's message: JSON.parse quotes the input ("<body>" is not valid JSON),
// and bodies carry passwords and tokens.
export class MalformedBodyError extends Error {
  readonly name = "MalformedBodyError";
  readonly code = "bad_request";
  readonly statusCode = 400;

  constructor(public readonly bodyKind: string) {
    super(`Malformed ${bodyKind} body`);
  }
}

import { env } from "node:process";

import { parseBoolean } from "#vendor/utils/env/parse-boolean.js";

function parseOriginsList(value: string | undefined): readonly string[] {
  if (value === undefined || value.trim() === "") return [];
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export default Object.freeze({
  enforce: parseBoolean(env["CSRF_ENFORCE"], false),
  strictOrigin: parseBoolean(env["CSRF_STRICT_ORIGIN"], false),
  allowedOrigins: parseOriginsList(env["CSRF_ALLOWED_ORIGINS"]),
  headerName: "x-csrf-token",
});

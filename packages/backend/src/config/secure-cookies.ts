import { env } from "node:process";

export function shouldUseSecureCookies(): boolean {
  if (env["APP_ENV"] === "local") {
    return false;
  }

  const appUrl = env["APP_URL"];
  if (appUrl === undefined || appUrl === "") {
    return true;
  }

  try {
    return new URL(appUrl).protocol === "https:";
  } catch {
    console.warn(
      `[secure-cookies] Invalid APP_URL "${appUrl}", defaulting secure cookies to true`,
    );
    return true;
  }
}

import appConfig from "#config/app.js";

export function getWsUrl(): string {
  const baseUrl = appConfig.url.trim();
  if (baseUrl === "") {
    return "";
  }

  try {
    const url = new URL(baseUrl);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/websocket";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

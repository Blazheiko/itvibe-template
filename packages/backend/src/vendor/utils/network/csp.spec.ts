import { describe, expect, it } from "vitest";

import {
  CSP_HEADER,
  CSP_REPORT_ONLY_HEADER,
  CspConfigError,
  STRICT_CSP,
  SVG_CSP,
  buildCspValue,
  buildDocumentDirectives,
  hasCspHeader,
  originOf,
  parseOrigin,
  parseOriginList,
  parseReportUri,
  resolveCspHeaders,
  type DocumentPolicyInput,
} from "./csp.js";

const baseInput: DocumentPolicyInput = {
  isProduction: true,
  apiOrigin: null,
  wsOrigin: null,
  sentryOrigin: null,
  mediaOrigin: null,
  extraConnectSrc: [],
  extraImgSrc: [],
  reportUri: null,
};

const directive = (policy: string, name: string): string | undefined =>
  policy
    .split("; ")
    .find((part) => part === name || part.startsWith(`${name} `));

describe("buildCspValue", () => {
  it("joins directives, skips empty lists and dedupes sources", () => {
    expect(
      buildCspValue({
        "default-src": ["'self'", "'self'"],
        "img-src": [],
        "upgrade-insecure-requests": true,
      }),
    ).toBe("default-src 'self'; upgrade-insecure-requests");
  });

  it.each([
    "https://a.test; script-src *",
    "https://a.test,https://b.test",
    "a b",
    "a\nb",
  ])("rejects a source that would inject into the header: %j", (source) => {
    expect(() => buildCspValue({ "img-src": [source] })).toThrow(
      CspConfigError,
    );
  });
});

describe("origin parsing", () => {
  it("accepts an http(s) origin and drops a trailing slash", () => {
    expect(parseOrigin("https://api.test/", ["http"], "X")).toBe(
      "https://api.test",
    );
    expect(parseOrigin("http://localhost:3000", ["http"], "X")).toBe(
      "http://localhost:3000",
    );
  });

  it.each([
    ["ws://api.test", ["http"]],
    ["https://api.test", ["ws"]],
    ["https://api.test/path", ["http"]],
    ["https://user:pw@api.test", ["http"]],
    ["api.test", ["http"]],
    ["https://api.test;x", ["http"]],
  ] as const)("rejects %s for %j", (value, schemes) => {
    expect(() => parseOrigin(value, schemes, "X")).toThrow(CspConfigError);
  });

  it("parses a comma-separated list per scheme family", () => {
    expect(
      parseOriginList(" https://a.test , wss://b.test ,", ["http", "ws"], "X"),
    ).toEqual(["https://a.test", "wss://b.test"]);
    expect(parseOriginList(undefined, ["http"], "X")).toEqual([]);
    expect(() => parseOriginList("wss://b.test", ["http"], "X")).toThrow(
      CspConfigError,
    );
  });

  it("takes the origin of the real WS endpoint and of a CDN URL with a path", () => {
    expect(originOf("wss://app.test/api/websocket", ["ws"], "WS")).toBe(
      "wss://app.test",
    );
    expect(originOf("ws://127.0.0.1:3000/api/websocket", ["ws"], "WS")).toBe(
      "ws://127.0.0.1:3000",
    );
    expect(originOf("https://cdn.test/bucket/app/", ["http"], "CDN_URL")).toBe(
      "https://cdn.test",
    );
  });

  it("accepts a report URI with a path, but only over http(s)", () => {
    expect(
      parseReportUri("https://reports.test/api/123/security/?key=k", "R"),
    ).toBe("https://reports.test/api/123/security/?key=k");
    expect(() => parseReportUri("wss://reports.test/x", "R")).toThrow(
      CspConfigError,
    );
    expect(() => parseReportUri("/csp-report", "R")).toThrow(CspConfigError);
  });
});

describe("buildDocumentDirectives", () => {
  it("allows only same-origin scripts and no inline script", () => {
    const policy = buildCspValue(buildDocumentDirectives(baseInput));

    expect(directive(policy, "script-src")).toBe("script-src 'self'");
    expect(directive(policy, "default-src")).toBe("default-src 'self'");
    expect(directive(policy, "frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(directive(policy, "connect-src")).toBe("connect-src 'self'");
    expect(directive(policy, "upgrade-insecure-requests")).toBeDefined();
  });

  it("adds the API, WS, Sentry, media and extra origins where the browser uses them", () => {
    const policy = buildCspValue(
      buildDocumentDirectives({
        ...baseInput,
        apiOrigin: "https://api.test",
        wsOrigin: "wss://ws.test",
        sentryOrigin: "https://o1.ingest.sentry.test",
        mediaOrigin: "https://cdn.test",
        extraConnectSrc: ["https://extra.test"],
        extraImgSrc: ["https://img.test"],
        reportUri: "https://reports.test/csp",
      }),
    );

    expect(directive(policy, "connect-src")).toBe(
      "connect-src 'self' https://api.test wss://ws.test https://o1.ingest.sentry.test https://extra.test",
    );
    expect(directive(policy, "img-src")).toBe(
      "img-src 'self' data: blob: https://cdn.test https://img.test",
    );
    expect(directive(policy, "report-uri")).toBe(
      "report-uri https://reports.test/csp",
    );
  });

  it("allows local HMR sockets and drops upgrade-insecure-requests outside production", () => {
    const policy = buildCspValue(
      buildDocumentDirectives({ ...baseInput, isProduction: false }),
    );

    expect(directive(policy, "connect-src")).toBe(
      "connect-src 'self' ws://localhost:* ws://127.0.0.1:*",
    );
    expect(directive(policy, "upgrade-insecure-requests")).toBeUndefined();
  });
});

describe("resolveCspHeaders", () => {
  it("writes nothing when disabled", () => {
    expect(
      resolveCspHeaders({
        enabled: false,
        reportOnly: false,
        documentPolicy: "x",
      }),
    ).toEqual({
      document: null,
      svg: null,
      strict: null,
    });
  });

  it("uses one enforcing header name for every response type", () => {
    const headers = resolveCspHeaders({
      enabled: true,
      reportOnly: false,
      documentPolicy: "doc",
    });

    expect(headers.document).toEqual({ name: CSP_HEADER, value: "doc" });
    expect(headers.svg).toEqual({ name: CSP_HEADER, value: SVG_CSP });
    expect(headers.strict).toEqual({ name: CSP_HEADER, value: STRICT_CSP });
  });

  it("makes every global policy Report-Only in report-only mode", () => {
    const headers = resolveCspHeaders({
      enabled: true,
      reportOnly: true,
      documentPolicy: "doc",
    });

    expect(headers.document?.name).toBe(CSP_REPORT_ONLY_HEADER);
    expect(headers.svg?.name).toBe(CSP_REPORT_ONLY_HEADER);
    expect(headers.strict?.name).toBe(CSP_REPORT_ONLY_HEADER);
  });
});

describe("hasCspHeader", () => {
  it("detects either CSP header name case-insensitively", () => {
    expect(
      hasCspHeader([{ name: "Content-Security-Policy", value: "x" }]),
    ).toBe(true);
    expect(
      hasCspHeader([
        { name: "content-security-policy-report-only", value: "x" },
      ]),
    ).toBe(true);
    expect(hasCspHeader([{ name: "x-frame-options", value: "DENY" }])).toBe(
      false,
    );
  });
});

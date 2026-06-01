import { afterEach, describe, expect, it, vi } from "vitest";

type MockRequest = {
  getHeader: (name: string) => string;
};

type MockResponse = {
  getRemoteAddressAsText: () => ArrayBuffer;
};

function makeReq(headers: Record<string, string>): MockRequest {
  return {
    getHeader(name: string): string {
      return headers[name.toLowerCase()] ?? "";
    },
  };
}

function makeRes(ip: string): MockResponse {
  return {
    getRemoteAddressAsText(): ArrayBuffer {
      return Uint8Array.from(Buffer.from(ip)).buffer;
    },
  };
}

afterEach(() => {
  vi.resetModules();
  delete process.env["TRUST_PROXY"];
  delete process.env["TRUSTED_PROXY_CIDRS"];
});

describe("get-ip trust proxy handling", () => {
  it("ignores spoofed forwarded headers when trust proxy is disabled", async () => {
    process.env["TRUST_PROXY"] = "false";
    const { default: getIp } = await import("./get-ip.js");

    const ip = getIp(
      makeReq({
        "x-forwarded-for": "1.2.3.4",
        "x-real-ip": "5.6.7.8",
      }) as never,
      makeRes("10.0.0.10") as never,
    );

    expect(ip).toBe("10.0.0.10");
  });

  it("uses the nearest untrusted client IP from an X-Forwarded-For chain when remote proxy is trusted", async () => {
    process.env["TRUST_PROXY"] = "true";
    process.env["TRUSTED_PROXY_CIDRS"] = "10.0.0.0/8, 127.0.0.1/32";
    const { default: getIp } = await import("./get-ip.js");

    const ip = getIp(
      makeReq({ "x-forwarded-for": "203.0.113.10, 10.1.2.3" }) as never,
      makeRes("10.9.8.7") as never,
    );

    expect(ip).toBe("203.0.113.10");
  });

  it("ignores forwarded chain when the direct peer is not trusted even if TRUST_PROXY=true", async () => {
    process.env["TRUST_PROXY"] = "true";
    process.env["TRUSTED_PROXY_CIDRS"] = "10.0.0.0/8";
    const { default: getIp } = await import("./get-ip.js");

    const ip = getIp(
      makeReq({ "x-forwarded-for": "203.0.113.10" }) as never,
      makeRes("198.51.100.55") as never,
    );

    expect(ip).toBe("198.51.100.55");
  });

  it("falls back to x-real-ip only when the direct peer is trusted and x-forwarded-for is absent", async () => {
    process.env["TRUST_PROXY"] = "true";
    process.env["TRUSTED_PROXY_CIDRS"] = "10.0.0.0/8";
    const { default: getIp } = await import("./get-ip.js");

    const ip = getIp(
      makeReq({ "x-real-ip": "203.0.113.20" }) as never,
      makeRes("10.2.3.4") as never,
    );

    expect(ip).toBe("203.0.113.20");
  });

  it("matches exact IP and CIDR rules via helper normalization", async () => {
    process.env["TRUST_PROXY"] = "true";
    process.env["TRUSTED_PROXY_CIDRS"] = "::1/128, 192.168.0.0/16";
    const { __testables__ } = await import("./get-ip.js");

    expect(__testables__.normalizeIp("::ffff:127.0.0.1")).toBe("127.0.0.1");
    expect(__testables__.isIpInCidr("192.168.1.25", "192.168.0.0/16")).toBe(
      true,
    );
    expect(__testables__.isIpInCidr("192.169.1.25", "192.168.0.0/16")).toBe(
      false,
    );
    expect(__testables__.isIpInCidr("::1", "::1/128")).toBe(true);
  });
});

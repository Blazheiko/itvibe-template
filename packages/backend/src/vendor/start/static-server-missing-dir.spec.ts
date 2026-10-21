import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("#config/app.js", () => ({
  default: { env: "test", serveStatic: true },
}));

const warn = vi.fn();
vi.mock("#vendor/utils/logger.js", () => ({
  default: { warn, info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// STATIC_PATH is resolved at import time, so point cwd at a dir without ./public first.
const emptyCwd = await fs.mkdtemp(path.join(os.tmpdir(), "static-server-"));
vi.spyOn(process, "cwd").mockReturnValue(emptyCwd);

const { cacheStaticSource } = await import("./static-server.js");

afterAll(async () => {
  vi.restoreAllMocks();
  await fs.rm(emptyCwd, { recursive: true, force: true });
});

describe("cacheStaticSource without a public directory", () => {
  it("warns and skips static serving instead of crashing", async () => {
    await expect(cacheStaticSource()).resolves.toBeNull();
    expect(warn).toHaveBeenCalledWith(
      { staticPath: path.join(emptyCwd, "public") },
      expect.stringContaining("static directory is missing"),
    );
  });
});

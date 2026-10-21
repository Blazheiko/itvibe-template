import { configDefaults, defineConfig } from "vitest/config";

import baseConfig from "./vitest.config.ts";

// Integration tests against a real Redis (REDIS_TEST_URL). Without the variable
// every suite is skipped; CI runs them with a Redis service. Built by hand rather
// than with mergeConfig, which would concatenate the base exclude list.
export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    include: ["src/**/*.redis.test.ts"],
    exclude: [...configDefaults.exclude, "dist/**"],
    fileParallelism: false,
    testTimeout: 15_000,
  },
});

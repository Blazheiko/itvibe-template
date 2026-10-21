import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

const packageRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    // *.redis.test.ts need a real Redis: run them with `pnpm test:redis`.
    exclude: [...configDefaults.exclude, "dist/**", "**/*.redis.test.ts"],
  },
  resolve: {
    alias: {
      "#app": resolve(packageRoot, "src/app"),
      "#config": resolve(packageRoot, "src/config"),
      "#vendor": resolve(packageRoot, "src/vendor"),
      "#database": resolve(packageRoot, "src/database"),
      "#drizzle": resolve(packageRoot, "src/drizzle"),
      "#logger": resolve(packageRoot, "src/vendor/utils/logger.ts"),
    },
  },
});

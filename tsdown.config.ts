import { defineConfig } from "tsdown";

export default defineConfig({
  platform: "neutral",
  entry: ["src/index.ts", "src/without-countries.js"],
  format: ["cjs", "esm"],
  exports: true,
  dts: true,
});

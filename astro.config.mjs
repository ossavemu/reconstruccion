// @ts-check
import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";

// Static site by default; API routes opt out with `export const prerender = false`.
export default defineConfig({
  output: "static",
  adapter: vercel(),
});

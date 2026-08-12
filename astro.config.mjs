// @ts-check
import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";
import sitemap from "@astrojs/sitemap";

// Static site by default; API routes opt out with `export const prerender = false`.
export default defineConfig({
  site: "https://reconstruccion.vercel.app",
  output: "static",
  adapter: vercel(),
  integrations: [sitemap()],
});

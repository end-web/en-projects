import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  // Use repository sub-path when building on GitHub Actions for Pages.
  base: process.env.GITHUB_ACTIONS === "true" ? "/en-projects/" : "/",
  plugins: [vue()]
});

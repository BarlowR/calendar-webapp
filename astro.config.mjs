// @ts-check
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  site: "https://barlowr.github.io",
  base: "/calendar-webapp",
  // Match Vite's old dev port so the Google OAuth client's authorized
  // JavaScript origin (http://localhost:5173) keeps working. strictPort
  // makes the server error out if 5173 is taken instead of silently
  // drifting to 5174+, which would be an unregistered (rejected) origin.
  server: { port: 5173, strictPort: true },
  preview: { port: 5173, strictPort: true },
});

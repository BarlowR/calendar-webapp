// @ts-check
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  site: "https://in-hindsight.app",
  // Match Vite's old dev port so the Google OAuth client's authorized
  // JavaScript origin (http://localhost:5173) keeps working. strictPort
  // (set via `vite.server.strictPort` below, since Astro's own
  // server/preview config has no such key) makes the server error out if
  // 5173 is taken instead of silently drifting to 5174+, which would be an
  // unregistered (rejected) origin.
  server: { port: 5173 },
  preview: { port: 5173 },
  vite: { server: { strictPort: true } },
});

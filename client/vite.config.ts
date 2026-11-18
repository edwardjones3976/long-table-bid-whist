import { fileURLToPath } from "node:url";
import basicSsl from "@vitejs/plugin-basic-ssl";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// A headset only allows WebXR on a secure page, so "npm run dev:xr" (--mode xr) or
// XR_HTTPS=1 serves the dev client over https with a self-signed certificate on the LAN.
export default defineConfig(({ mode }) => {
  const https = mode === "xr" || process.env.XR_HTTPS === "1";
  return {
    root: fileURLToPath(new URL(".", import.meta.url)),
    plugins: [react(), ...(https ? [basicSsl()] : [])],
    build: { outDir: "dist", emptyOutDir: true },
    server: {
      port: 5173,
      strictPort: true,
      host: https ? "0.0.0.0" : undefined,
      // The client imports the wire contract and rule types from ../shared and ../server/games.
      fs: { allow: [".."] },
      proxy: { "/socket.io": { target: "http://localhost:3000", ws: true } },
    },
  };
});

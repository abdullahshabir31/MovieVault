import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite"; // 👈 ye import add karein
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // ... resolve/alias same rehne dein
  plugins: [
    tailwindcss(),
    tanstackStart({
      server: { entry: "server" },
      router: {
        entry: "router.jsx",
        disableTypes: true,
        routeTreeFileFooter: [],
      },
    }),
    nitro(), // 👈 ye plugin add karein (tanstackStart ke turant baad)
    viteReact(),
    VitePWA({/* same rehne dein */}),
    stripRouteTreeTypeFooter(),
  ],
});

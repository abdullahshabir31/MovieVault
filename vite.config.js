import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

// Plain Vite + TanStack Start config (no external build-tooling package).
// The `@` alias below is what previously came from the tsconfig "paths"
// entry — since this project no longer uses TypeScript, it's declared
// directly here instead.

// The router-tree generator always appends a `declare module` / `import
// type` footer to routeTree.gen.js for TS "Register" typing, even with
// `disableTypes: true` (there's no config flag to turn that block off).
// This strips it so the generated file stays valid plain JavaScript.
function stripRouteTreeTypeFooter() {
  return {
    name: "strip-route-tree-ts-footer",
    enforce: "pre",
    transform(code, id) {
      if (id.includes("routeTree.gen") && code.includes("\nimport type")) {
        return code.slice(0, code.indexOf("\nimport type")) + "\n";
      }
      return null;
    },
  };
}

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  plugins: [
    stripRouteTreeTypeFooter(),
    tailwindcss(),
    tanstackStart({
      // Redirect TanStack Start's bundled server entry to src/server.js (our SSR error wrapper).
      server: { entry: "server" },
      router: {
        entry: "router.jsx",
        // Pure-JS project: generate routeTree.gen.js instead of .ts, and
        // skip the TypeScript-only `declare module` Register block that
        // TanStack Start would otherwise still append to the footer.
        disableTypes: true,
        routeTreeFileFooter: [],
      },
    }),
    viteReact(),
  ],
});

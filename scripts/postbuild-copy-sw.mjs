// vite-plugin-pwa (injectManifest strategy) builds src/sw.js as a separate,
// later sub-build that only writes to the `outDir` we gave it in
// vite.config.js (".output/public"). Nitro's own build already wrote the
// real client assets straight into the deploy target's actual static
// directory *before* that sub-build ran — so on Vercel that's
// .vercel/output/static, and the freshly-built sw.js gets left behind in
// .output/public where nothing ever serves it. Result: /sw.js 404s in
// production, the service worker never installs, and the Notifications
// toggle on the profile page stays stuck disabled forever.
//
// This copies the built sw.js into whichever real static output directory
// exists after the build, so it actually ships with the deployment.
import { existsSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const swSource = join(root, ".output/public/sw.js");

if (!existsSync(swSource)) {
  console.warn("[postbuild-copy-sw] .output/public/sw.js not found — skipping (did the PWA build run?).");
  process.exit(0);
}

// Add other deploy targets' static dirs here if you deploy elsewhere too
// (e.g. Netlify, Cloudflare) — this is a no-op for any dir that doesn't exist.
const staticDirs = [
  join(root, ".vercel/output/static"), // Vercel
  join(root, ".output/public"), // Nitro's default node-server preset — already correct, harmless no-op
];

let copied = 0;
for (const dir of staticDirs) {
  if (!existsSync(dir)) continue;
  const dest = join(dir, "sw.js");
  if (dest === swSource) continue;
  copyFileSync(swSource, dest);
  console.log(`[postbuild-copy-sw] copied sw.js -> ${dest}`);
  copied++;
}

if (copied === 0) {
  console.warn("[postbuild-copy-sw] No known static output directory found — sw.js was not copied anywhere.");
}

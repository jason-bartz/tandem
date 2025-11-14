const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const srcCandidates = [
  path.join(rootDir, 'capacitor.config.json'),
  path.join(rootDir, 'ios', 'App', 'App', 'capacitor.config.json'),
];
const outDir = path.join(rootDir, 'out');
const dest = path.join(outDir, 'capacitor.config.json');

const src = srcCandidates.find((candidate) => fs.existsSync(candidate));

try {
  if (!fs.existsSync(outDir)) {
    console.warn('[copy-cap-config] Skipping copy because the out directory does not exist yet.');
    process.exit(0);
  }

  if (!src) {
    console.warn('[copy-cap-config] Skipping copy because capacitor.config.json was not found.');
    process.exit(0);
  }

  fs.copyFileSync(src, dest);
  console.log('[copy-cap-config] Copied capacitor.config.json into out/.');
} catch (error) {
  console.error('[copy-cap-config] Failed to copy capacitor.config.json:', error);
  process.exit(1);
}

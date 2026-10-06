// Copies the web app into www/. GitHub Pages publishes www/, and Capacitor
// bundles the same folder into the Android/iOS app — one site, two outputs.
import { cpSync, rmSync, mkdirSync, existsSync } from 'node:fs';

const OUT = 'www';
const FILES = ['index.html', 'privacy.html', 'manifest.webmanifest', 'sw.js', '.nojekyll'];
const DIRS = ['css', 'js', 'fonts', 'icons', 'content', 'progress'];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT);
for (const f of FILES) if (existsSync(f)) cpSync(f, `${OUT}/${f}`);
for (const d of DIRS) if (existsSync(d)) cpSync(d, `${OUT}/${d}`, { recursive: true });
console.log(`Built ${OUT}/`);

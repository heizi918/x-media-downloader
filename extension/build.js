import * as esbuild from 'esbuild';
import { existsSync, mkdirSync, cpSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outdir = join(__dirname, 'dist');

// Ensure output directory exists
if (!existsSync(outdir)) {
  mkdirSync(outdir, { recursive: true });
}

// Copy static files
const staticFiles = ['manifest.json', 'popup.html', 'styles', 'icons'];
for (const file of staticFiles) {
  const src = join(__dirname, file);
  const dest = join(outdir, file);
  if (existsSync(src)) {
    cpSync(src, dest, { recursive: true });
  }
}

// Build content script
await esbuild.build({
  entryPoints: [join(__dirname, 'content.ts')],
  bundle: true,
  outfile: join(outdir, 'content.js'),
  format: 'iife',
  platform: 'browser',
  minify: true,
});

// Build background script
await esbuild.build({
  entryPoints: [join(__dirname, 'background.ts')],
  bundle: true,
  outfile: join(outdir, 'background.js'),
  format: 'iife',
  platform: 'browser',
  minify: true,
});

// Build popup script (tsx)
await esbuild.build({
  entryPoints: [join(__dirname, 'popup.tsx')],
  bundle: true,
  outfile: join(outdir, 'popup.js'),
  format: 'iife',
  platform: 'browser',
  jsx: 'automatic',
  minify: true,
});

console.log('Extension built successfully to', outdir);

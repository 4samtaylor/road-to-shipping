// Renders the source images @capacitor/assets needs from the site's icon design,
// then `npx capacitor-assets generate` turns them into every Android/iOS size.
import sharp from 'sharp';

const BG = '#080810';
const glyph = (s) => `<path d="M128 352 L256 176 L384 352" fill="none" stroke="#00ff88" stroke-width="40" stroke-linejoin="round"/>
  <rect x="128" y="392" width="256" height="16" fill="#1c1c30"/><rect x="128" y="392" width="104" height="16" fill="#00ff88"/>`;
const svg = (body, bg, scale = 1) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  ${bg ? `<rect width="512" height="512" fill="${bg}"/>` : ''}
  <g transform="translate(256 ${256 + 18 * scale}) scale(${scale}) translate(-256 -292)">${body}</g></svg>`);

const out = (buf, size, file) => sharp(buf).resize(size, size).png().toFile(`assets/${file}`);
await out(svg(glyph(), BG, 1), 1024, 'icon-only.png');
await out(svg(glyph(), null, 0.62), 1024, 'icon-foreground.png');   // Android adaptive icons crop to the middle ~66%
await out(svg('', BG), 1024, 'icon-background.png');
await out(svg(glyph(), BG, 0.45), 2732, 'splash.png');
await out(svg(glyph(), BG, 0.45), 2732, 'splash-dark.png');
console.log('assets/ ready');

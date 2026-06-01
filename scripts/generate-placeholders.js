#!/usr/bin/env node
/**
 * Generate proper SVG placeholder images for all products.
 * These are saved as .svg files and look like Minecraft-themed product cards.
 */

const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.resolve(__dirname, '..', 'images', 'products');

const products = [
  { slug: 'skyblock-ultimate', name: 'Skyblock Ultimate', cat: 'Addon', colors: ['#059669','#047857'], icon: '🏝️' },
  { slug: 'lucky-block', name: 'Lucky Block', cat: 'Addon', colors: ['#d97706','#b45309'], icon: '🎲' },
  { slug: 'one-block-survival', name: 'One Block Survival', cat: 'World', colors: ['#2563eb','#1d4ed8'], icon: '🧊' },
  { slug: 'pvp-arena-masters', name: 'PvP Arena Masters', cat: 'World', colors: ['#dc2626','#b91c1c'], icon: '⚔️' },
  { slug: 'medieval-knights', name: 'Medieval Knights', cat: 'Skin Pack', colors: ['#7c3aed','#6d28d9'], icon: '🛡️' },
  { slug: 'realistic-hd', name: 'Realistic HD', cat: 'Texture Pack', colors: ['#0891b2','#0e7490'], icon: '🎨' },
  { slug: 'dropper-deluxe', name: 'Dropper Deluxe', cat: 'World', colors: ['#e11d48','#be123c'], icon: '⬇️' },
  { slug: 'survival-island', name: 'Survival Island', cat: 'World', colors: ['#16a34a','#15803d'], icon: '🌴' },
  { slug: 'parkour-paradise', name: 'Parkour Paradise', cat: 'World', colors: ['#ea580c','#c2410c'], icon: '🏃' },
  { slug: 'survival-plus', name: 'Survival Plus', cat: 'Addon', colors: ['#4f46e5','#4338ca'], icon: '🏕️' },
  { slug: 'furniture-craft', name: 'Furniture Craft', cat: 'Addon', colors: ['#0d9488','#0f766e'], icon: '🪑' },
  { slug: 'more-mobs', name: 'More Mobs', cat: 'Addon', colors: ['#9333ea','#7e22ce'], icon: '🐉' },
  { slug: 'weapons-plus', name: 'Weapons Plus', cat: 'Addon', colors: ['#b91c1c','#991b1b'], icon: '🗡️' },
];

function makeSvg(name, cat, colors, icon, w, h) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors[0]}"/>
      <stop offset="100%" style="stop-color:${colors[1]}"/>
    </linearGradient>
    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <rect width="20" height="20" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <rect width="${w}" height="${h}" fill="url(#grid)"/>
  <text x="${w/2}" y="${h*0.42}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="${w > 600 ? 48 : 32}" fill="white" opacity="0.9">${icon}</text>
  <text x="${w/2}" y="${h*0.62}" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-weight="700" font-size="${w > 600 ? 28 : 18}" fill="white" letter-spacing="0.5">${name}</text>
  <text x="${w/2}" y="${h*0.75}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="${w > 600 ? 16 : 12}" fill="rgba(255,255,255,0.7)" text-transform="uppercase" letter-spacing="2">${cat}</text>
  <rect x="${w*0.3}" y="${h*0.82}" width="${w*0.4}" height="2" rx="1" fill="rgba(255,255,255,0.3)"/>
</svg>`;
}

let count = 0;

for (const p of products) {
  // Thumbnail (400x225)
  const thumbPath = path.join(IMAGES_DIR, `${p.slug}-thumb.svg`);
  fs.writeFileSync(thumbPath, makeSvg(p.name, p.cat, p.colors, p.icon, 400, 225));
  count++;

  // Hero (800x450) — only for products that had hero images
  const heroPath = path.join(IMAGES_DIR, `${p.slug}-hero.svg`);
  fs.writeFileSync(heroPath, makeSvg(p.name, p.cat, p.colors, p.icon, 800, 450));
  count++;
}

// Delete old .jpg placeholders
const files = fs.readdirSync(IMAGES_DIR);
for (const f of files) {
  if (f.endsWith('.jpg')) {
    fs.unlinkSync(path.join(IMAGES_DIR, f));
    console.log(`  🗑️  Deleted ${f}`);
  }
}

console.log(`\n✅ Generated ${count} SVG placeholder images\n`);

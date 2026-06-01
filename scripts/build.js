#!/usr/bin/env node
/**
 * BedrockStoreFinder — Static Site Build Script
 *
 * Reads product data from data/catalog.json + data/premium/*.json and generates:
 *   - All HTML pages (product, category, creator, homepage)
 *   - Static JSON API files (api/v1/)
 *   - SEO files (llms.txt, llms-full.txt, sitemap.xml)
 *   - Agent discovery files (.well-known/, openapi.yaml, _headers)
 *
 * Usage: node scripts/build.js
 *
 * Run this after updating product data to regenerate the entire site.
 * The GitHub Actions workflow runs this every Tuesday automatically.
 */

const { today } = require('./lib/helpers');
const { setCategories } = require('./lib/template');
const {
  ROOT,
  loadAllProducts,
  loadCategories,
  loadCreators,
  getProductsByCategory,
  getProductsByCreator,
  computeStats
} = require('./lib/data-loader');

const { buildProductPages } = require('./lib/page-generator');
const { buildCategoryPages } = require('./lib/category-generator');
const { buildCreatorPages } = require('./lib/creator-generator');
const { buildHomepage } = require('./lib/home-generator');
const { buildApiFiles } = require('./lib/api-generator');
const { buildLlmsTxt, buildLlmsFullTxt, buildSitemap } = require('./lib/seo-generator');
const { buildDiscoveryFiles } = require('./lib/discovery-generator');

const todayStr = today();

console.log(`\n🔨 Building site (${todayStr})\n`);

// --- Load Data ---
console.log('Loading data...');
const categories = loadCategories();
setCategories(categories); // Make categories available to template.js

const creators = loadCreators();
const { site, products, premiumSlugs } = loadAllProducts();

const productsByCategory = getProductsByCategory(products);
const productsByCreator = getProductsByCreator(products);
const stats = computeStats(products, categories);

console.log(`  ${products.length} products (${premiumSlugs.size} premium, ${products.length - premiumSlugs.size} standard)`);
console.log(`  ${categories.length} categories`);
console.log(`  ${creators.length} creators\n`);

// --- Build Product Pages ---
console.log('Building product pages...');
const { premiumCount, standardCount } = buildProductPages(products, premiumSlugs, site, ROOT);
console.log(`  ✓ ${premiumCount} premium pages, ${standardCount} standard pages\n`);

// --- Build Category Pages ---
console.log('Building category pages...');
const totalCategoryPages = buildCategoryPages(categories, productsByCategory, site, ROOT);
console.log(`  ✓ ${totalCategoryPages} category pages\n`);

// --- Build Creator Pages ---
console.log('Building creator pages...');
const totalCreatorPages = buildCreatorPages(creators, productsByCreator, site, ROOT);
console.log(`  ✓ ${totalCreatorPages} creator pages + listing\n`);

// --- Build Homepage ---
console.log('Building homepage...');
buildHomepage(products, categories, stats, site, ROOT);
console.log('  ✓ index.html\n');

// --- Build Static JSON API ---
console.log('Building API files...');
const apiResult = buildApiFiles(products, categories, creators, stats, site, ROOT);
console.log(`  ✓ ${apiResult.files} API files\n`);

// --- Build SEO Files ---
console.log('Building SEO files...');
buildLlmsTxt(products, categories, site, ROOT);
console.log('  ✓ llms.txt');
buildLlmsFullTxt(products, categories, site, ROOT);
console.log('  ✓ llms-full.txt');
const sitemapUrls = buildSitemap(products, categories, creators, site, ROOT);
console.log(`  ✓ sitemap.xml (${sitemapUrls} URLs)\n`);

// --- Build Agent Discovery Files ---
console.log('Building discovery files...');
const discoveryCount = buildDiscoveryFiles(site, stats, ROOT);
console.log(`  ✓ .well-known/ai-plugin.json`);
console.log(`  ✓ .well-known/agent-card.json`);
console.log(`  ✓ api/openapi.yaml`);
console.log(`  ✓ _headers (CORS)\n`);

// --- Stage deployable files to _site/ ---
console.log('Staging deployment files to _site/...');
const { ensureDir } = require('./lib/helpers');
const fsCopy = require('fs');
const pathCopy = require('path');

const SITE_DIR = pathCopy.join(ROOT, '_site');

function copyRecursive(src, dest) {
  if (!fsCopy.existsSync(src)) return;
  const stat = fsCopy.statSync(src);
  if (stat.isDirectory()) {
    ensureDir(dest);
    for (const child of fsCopy.readdirSync(src)) {
      copyRecursive(pathCopy.join(src, child), pathCopy.join(dest, child));
    }
  } else {
    ensureDir(pathCopy.dirname(dest));
    fsCopy.copyFileSync(src, dest);
  }
}

// Clean _site/
if (fsCopy.existsSync(SITE_DIR)) {
  fsCopy.rmSync(SITE_DIR, { recursive: true, force: true });
}
ensureDir(SITE_DIR);

// Copy deployable directories
const deployDirs = ['addons', 'worlds', 'skin-packs', 'texture-packs', 'mashups', 'creators', 'guides', 'about', 'css', 'js', 'images', 'api', '.well-known'];
for (const dir of deployDirs) {
  copyRecursive(pathCopy.join(ROOT, dir), pathCopy.join(SITE_DIR, dir));
}

// Copy deployable root files
const deployFiles = ['index.html', 'robots.txt', 'sitemap.xml', 'llms.txt', 'llms-full.txt', '_headers'];
for (const file of deployFiles) {
  const src = pathCopy.join(ROOT, file);
  if (fsCopy.existsSync(src)) {
    fsCopy.copyFileSync(src, pathCopy.join(SITE_DIR, file));
  }
}

console.log('  ✓ _site/ ready for deployment\n');

// --- Summary ---
console.log('═'.repeat(50));
console.log(`✅ Build complete!`);
console.log(`   ${products.length} products (${premiumSlugs.size} premium)`);
console.log(`   ${totalCategoryPages} category pages`);
console.log(`   ${totalCreatorPages} creator profiles`);
console.log(`   ${apiResult.files} API files`);
console.log(`   ${sitemapUrls} sitemap URLs`);
console.log(`   Agent discovery: ai-plugin.json, agent-card.json, openapi.yaml`);
console.log(`   Deploy from: _site/`);
console.log('═'.repeat(50) + '\n');

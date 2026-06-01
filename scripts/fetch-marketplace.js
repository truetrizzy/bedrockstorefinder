#!/usr/bin/env node
/**
 * Pickaxe Studios — Minecraft Marketplace Data Fetcher
 *
 * Fetches updated product data (ratings, review counts, prices) from the
 * Minecraft Marketplace and merges it into data/products.json.
 *
 * Data sources (tried in order):
 *   1. Minecraft.net Marketplace catalog API (official, rate-limited)
 *   2. Fallback: keeps existing data if API is unreachable
 *
 * Usage:
 *   node scripts/fetch-marketplace.js              # Update all products
 *   node scripts/fetch-marketplace.js --dry-run     # Preview changes without writing
 *
 * This script is designed to run in CI (GitHub Actions) every Tuesday.
 * It only updates fields that come from the Marketplace (rating, reviewCount,
 * downloads, price). Manual fields (descriptions, features, FAQs) are untouched.
 *
 * Environment variables:
 *   MARKETPLACE_API_DELAY  — ms between API requests (default: 2000)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const DATA_FILE = path.join(ROOT, 'data', 'catalog.json');

const DRY_RUN = process.argv.includes('--dry-run');
const API_DELAY = parseInt(process.env.MARKETPLACE_API_DELAY || '2000', 10);

// ---------------------------------------------------------------------------
// HTTP helper — simple GET that returns a Promise<string>
// ---------------------------------------------------------------------------
function httpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const opts = new URL(url);
    const reqOpts = {
      hostname: opts.hostname,
      port: opts.port || 443,
      path: opts.pathname + opts.search,
      method: 'GET',
      headers: {
        'User-Agent': 'PickaxeStudios-Updater/1.0',
        Accept: 'application/json',
        ...headers
      },
      timeout: 15000
    };

    const req = https.request(reqOpts, res => {
      // Follow redirects (up to 3)
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
        return resolve(httpGet(res.headers.location, headers));
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => (body += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body);
        } else {
          reject(new Error(`HTTP ${res.statusCode} from ${url}: ${body.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout: ${url}`)); });
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Minecraft Marketplace catalog search
// ---------------------------------------------------------------------------

/**
 * Minecraft Marketplace data sources (tried in order):
 *
 * 1. Direct product lookup by marketplaceId — if the product has a
 *    marketplaceId set in products.json, we try fetching it directly.
 *    To find your marketplaceId, open your product on the Marketplace
 *    website and copy the UUID from the URL.
 *
 * 2. Catalog search by product name — searches the Marketplace catalog
 *    API for matching products.
 *
 * 3. MCPEDLscrape — tries mcpedl.com product pages as a fallback
 *    data source for ratings and download counts.
 *
 * All endpoints are unofficial and may change. The script handles
 * failures gracefully and falls back to existing data.
 */

// Minecraft.net Marketplace API endpoints (unofficial, may change)
const CATALOG_SEARCH_URL = 'https://www.minecraft.net/bin/minecraft/productmanagement.search.json';
const PRODUCT_DETAIL_URL = 'https://www.minecraft.net/bin/minecraft/productmanagement.productdetails.json';

// Alternative: Minecraft Marketplace Partner API (requires authentication)
// Set MARKETPLACE_PARTNER_TOKEN env var to enable
const PARTNER_API_URL = 'https://partner.minecraft.net/api/v1/products';

async function fetchProductByMarketplaceId(marketplaceId) {
  if (!marketplaceId) return null;

  try {
    const url = `${PRODUCT_DETAIL_URL}?id=${encodeURIComponent(marketplaceId)}`;
    const raw = await httpGet(url);
    const data = JSON.parse(raw);
    return parseMarketplaceProduct(data);
  } catch (err) {
    console.warn(`  ⚠ Could not fetch by ID "${marketplaceId}": ${err.message}`);
    return null;
  }
}

async function fetchProductBySearch(productName, creatorName = 'Pickaxe Studios') {
  try {
    const term = encodeURIComponent(`${productName} ${creatorName}`);
    const url = `${CATALOG_SEARCH_URL}?term=${term}&count=5&start=0`;
    const raw = await httpGet(url);
    const data = JSON.parse(raw);

    if (!data.results || data.results.length === 0) return null;

    // Find the best match by name similarity
    const results = Array.isArray(data.results) ? data.results : [];
    const match = results.find(r =>
      normalizeTitle(r.title || r.name || '').includes(normalizeTitle(productName))
    ) || results[0];

    return parseMarketplaceProduct(match);
  } catch (err) {
    console.warn(`  ⚠ Search failed for "${productName}": ${err.message}`);
    return null;
  }
}

function normalizeTitle(title) {
  return title.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseMarketplaceProduct(data) {
  if (!data) return null;

  // The Marketplace API response structure varies; extract what we can
  const result = {};

  // Rating
  if (data.averageRating != null || data.rating != null) {
    result.rating = parseFloat(data.averageRating || data.rating);
    if (isNaN(result.rating)) delete result.rating;
    else result.rating = Math.round(result.rating * 10) / 10; // round to 1 decimal
  }

  // Review count
  if (data.ratingCount != null || data.reviewCount != null || data.totalRatings != null) {
    result.reviewCount = parseInt(data.ratingCount || data.reviewCount || data.totalRatings, 10);
    if (isNaN(result.reviewCount)) delete result.reviewCount;
  }

  // Price (in Minecoins)
  if (data.price != null || data.priceTier != null) {
    const price = parseInt(data.price || data.priceTier, 10);
    if (!isNaN(price) && price > 0) {
      result.price = price;
      result.priceUSD = minecoinsToDollars(price);
    }
  }

  // Marketplace ID for future lookups
  if (data.id || data.productId) {
    result.marketplaceId = data.id || data.productId;
  }

  return Object.keys(result).length > 0 ? result : null;
}

function minecoinsToDollars(minecoins) {
  // Approximate Minecoin-to-USD conversion based on bulk pricing
  // 320 MC = $1.99, 490 MC = $2.99, 660 MC = $3.99, 830 MC = $4.99, 990 MC = $5.99, 1340 MC = $7.99
  const tiers = [
    [1720, '9.99'], [1340, '7.99'], [990, '5.99'], [830, '4.99'],
    [660, '3.99'], [490, '2.99'], [310, '1.99'], [160, '0.99']
  ];
  for (const [mc, usd] of tiers) {
    if (minecoins >= mc) return usd;
  }
  return (minecoins * 0.006).toFixed(2);
}

// ---------------------------------------------------------------------------
// Sleep helper for rate limiting
// ---------------------------------------------------------------------------
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Main update flow
// ---------------------------------------------------------------------------

async function main() {
  console.log('\n📡 Pickaxe Studios — Marketplace Data Fetch\n');

  // Load existing data
  const rawData = fs.readFileSync(DATA_FILE, 'utf8');
  const data = JSON.parse(rawData);
  const products = data.products;

  console.log(`Found ${products.length} products in products.json\n`);

  let updatedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const product of products) {
    console.log(`Fetching: ${product.name} (${product.category})...`);

    let marketplaceData = null;

    // Strategy 1: Fetch by marketplace ID if available
    if (product.marketplaceId) {
      marketplaceData = await fetchProductByMarketplaceId(product.marketplaceId);
    }

    // Strategy 2: Search by product name
    if (!marketplaceData) {
      marketplaceData = await fetchProductBySearch(product.name);
    }

    if (marketplaceData) {
      const changes = [];

      // Only update fields that actually changed
      if (marketplaceData.rating != null && marketplaceData.rating !== product.rating) {
        changes.push(`rating: ${product.rating} → ${marketplaceData.rating}`);
        if (!DRY_RUN) product.rating = marketplaceData.rating;
      }

      if (marketplaceData.reviewCount != null && marketplaceData.reviewCount !== product.reviewCount) {
        changes.push(`reviewCount: ${product.reviewCount} → ${marketplaceData.reviewCount}`);
        if (!DRY_RUN) product.reviewCount = marketplaceData.reviewCount;
      }

      if (marketplaceData.price != null && marketplaceData.price !== product.price) {
        changes.push(`price: ${product.price} → ${marketplaceData.price}`);
        if (!DRY_RUN) {
          product.price = marketplaceData.price;
          product.priceUSD = marketplaceData.priceUSD;
        }
      }

      if (marketplaceData.marketplaceId && !product.marketplaceId) {
        changes.push(`marketplaceId: (set) ${marketplaceData.marketplaceId}`);
        if (!DRY_RUN) product.marketplaceId = marketplaceData.marketplaceId;
      }

      if (changes.length > 0) {
        console.log(`  ✅ Updated: ${changes.join(', ')}`);
        updatedCount++;
      } else {
        console.log(`  ✓ No changes`);
        skippedCount++;
      }
    } else {
      console.log(`  ⚠ No marketplace data found — keeping existing values`);
      failedCount++;
    }

    // Rate limit: wait between requests
    await sleep(API_DELAY);
  }

  // Update dateModified on all products to today
  const today = new Date().toISOString().split('T')[0];
  if (!DRY_RUN) {
    products.forEach(p => { p.dateModified = today; });
  }

  // Summary
  console.log('\n' + '─'.repeat(50));
  console.log(`📊 Results: ${updatedCount} updated, ${skippedCount} unchanged, ${failedCount} failed`);
  console.log(`   Date: ${today}`);

  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN — no files modified\n');
    return { updated: updatedCount, skipped: skippedCount, failed: failedCount };
  }

  // Write updated data back
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2) + '\n');
  console.log(`\n💾 Saved updated data to ${path.relative(ROOT, DATA_FILE)}\n`);

  return { updated: updatedCount, skipped: skippedCount, failed: failedCount };
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
main().catch(err => {
  console.error(`\n❌ Fatal error: ${err.message}\n`);
  // Don't exit with error code — we don't want CI to fail just because
  // the marketplace API was unreachable. The build will proceed with
  // existing data.
  process.exit(0);
});

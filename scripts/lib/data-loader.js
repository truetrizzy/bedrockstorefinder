/**
 * data-loader.js — Loads and merges catalog + premium product data
 *
 * Two-tier system:
 *   - catalog.json: Standard-tier products (scraped, lightweight)
 *   - premium/*.json: Premium-tier products (hand-curated, rich content)
 *
 * Premium data overlays catalog data by slug. Scraped fields in catalog
 * are kept as defaults; premium files override/add to them.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');

function loadCatalog() {
  const catalogPath = path.join(DATA_DIR, 'catalog.json');
  const raw = fs.readFileSync(catalogPath, 'utf8');
  return JSON.parse(raw);
}

function loadPremiumProducts() {
  const premiumDir = path.join(DATA_DIR, 'premium');
  if (!fs.existsSync(premiumDir)) return [];

  const files = fs.readdirSync(premiumDir).filter(f => f.endsWith('.json'));
  return files.map(f => {
    const raw = fs.readFileSync(path.join(premiumDir, f), 'utf8');
    return JSON.parse(raw);
  });
}

function loadCategories() {
  const catPath = path.join(DATA_DIR, 'categories.json');
  const raw = fs.readFileSync(catPath, 'utf8');
  return JSON.parse(raw);
}

function loadCreators() {
  const creatorsPath = path.join(DATA_DIR, 'creators.json');
  const raw = fs.readFileSync(creatorsPath, 'utf8');
  return JSON.parse(raw);
}

/**
 * Merge catalog products with premium overlays.
 * Premium data takes precedence for overlapping fields.
 * Products that exist only in premium/ are added to the catalog.
 */
function loadAllProducts() {
  const catalog = loadCatalog();
  const premiumProducts = loadPremiumProducts();

  // Index catalog products by slug
  const productMap = new Map();
  for (const p of catalog.products) {
    productMap.set(p.slug, { ...p });
  }

  // Overlay premium data
  for (const premium of premiumProducts) {
    const existing = productMap.get(premium.slug);
    if (existing) {
      // Merge: premium fields override catalog fields
      productMap.set(premium.slug, { ...existing, ...premium });
    } else {
      // Premium-only product (not yet in catalog)
      productMap.set(premium.slug, { ...premium });
    }
  }

  const products = Array.from(productMap.values());

  // Sort: featured/promoted first, then by rating descending
  products.sort((a, b) => {
    if (a.promoted && !b.promoted) return -1;
    if (!a.promoted && b.promoted) return 1;
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return (b.rating || 0) - (a.rating || 0);
  });

  return {
    site: catalog.site,
    products,
    premiumSlugs: new Set(premiumProducts.map(p => p.slug))
  };
}

/**
 * Get products grouped by category
 */
function getProductsByCategory(products) {
  const grouped = {};
  for (const p of products) {
    if (!grouped[p.category]) grouped[p.category] = [];
    grouped[p.category].push(p);
  }
  return grouped;
}

/**
 * Get products grouped by creator slug
 */
function getProductsByCreator(products) {
  const grouped = {};
  for (const p of products) {
    const slug = p.creatorSlug || 'unknown';
    if (!grouped[slug]) grouped[slug] = [];
    grouped[slug].push(p);
  }
  return grouped;
}

/**
 * Compute aggregate statistics
 */
function computeStats(products, categories) {
  const stats = {
    totalProducts: products.length,
    totalPremium: products.filter(p => p.tier === 'premium').length,
    avgRating: products.length > 0
      ? Math.round((products.reduce((sum, p) => sum + (p.rating || 0), 0) / products.length) * 10) / 10
      : 0,
    totalReviews: products.reduce((sum, p) => sum + (p.reviewCount || 0), 0),
    categories: {},
    priceRange: { min: Infinity, max: 0 },
    topRated: products.slice(0, 10).map(p => ({ slug: p.slug, name: p.name, rating: p.rating, category: p.category })),
    lastUpdated: new Date().toISOString().split('T')[0]
  };

  for (const cat of categories) {
    const catProducts = products.filter(p => p.category === cat.key);
    stats.categories[cat.key] = {
      count: catProducts.length,
      avgRating: catProducts.length > 0
        ? Math.round((catProducts.reduce((sum, p) => sum + (p.rating || 0), 0) / catProducts.length) * 10) / 10
        : 0,
      avgPrice: catProducts.length > 0
        ? Math.round(catProducts.reduce((sum, p) => sum + (p.price || 0), 0) / catProducts.length)
        : 0
    };
  }

  for (const p of products) {
    if (p.price && p.price < stats.priceRange.min) stats.priceRange.min = p.price;
    if (p.price && p.price > stats.priceRange.max) stats.priceRange.max = p.price;
  }

  if (stats.priceRange.min === Infinity) stats.priceRange.min = 0;

  return stats;
}

module.exports = {
  ROOT,
  DATA_DIR,
  loadCatalog,
  loadPremiumProducts,
  loadCategories,
  loadCreators,
  loadAllProducts,
  getProductsByCategory,
  getProductsByCreator,
  computeStats
};

/**
 * api-generator.js — Generates static JSON API files
 *
 * Outputs into api/v1/ directory, served by GitHub Pages as static files.
 * These files enable AI agents and custom GPTs to query product data.
 */

const fs = require('fs');
const path = require('path');
const { ensureDir, interpolate } = require('./helpers');

/**
 * Standard API product shape (strips premium-only fields for the catalog endpoint)
 */
function toApiProduct(p) {
  return {
    slug: p.slug,
    name: p.name,
    creator: p.creator || 'Unknown',
    creatorSlug: p.creatorSlug || '',
    category: p.category,
    price: p.price,
    priceUSD: p.priceUSD || null,
    rating: p.rating,
    reviewCount: p.reviewCount || 0,
    downloads: p.downloads || null,
    shortDesc: p.shortDesc,
    tags: p.tags || [],
    platforms: p.platforms || [],
    minecraftVersion: p.minecraftVersion || null,
    tier: p.tier || 'standard',
    featured: p.featured || false,
    dateModified: p.dateModified || null,
    url: `/${getCatSlug(p.category)}/${p.slug}/`
  };
}

/**
 * Full API product shape (includes premium data when available)
 */
function toApiProductFull(p) {
  const base = toApiProduct(p);
  if (p.tier !== 'premium') return base;

  return {
    ...base,
    longDesc: p.longDesc ? interpolate(p.longDesc, p) : null,
    features: p.features || [],
    reviews: (p.reviews || []).map(r => ({
      author: r.author,
      rating: r.rating,
      text: r.text,
      date: r.date
    })),
    faqs: (p.faqs || []).map(f => ({ question: f.q, answer: interpolate(f.a, p) })),
    multiplayer: p.multiplayer || null,
    version: p.version || null,
    images: p.images || null,
    marketplaceUrl: p.marketplaceUrl || null
  };
}

function getCatSlug(key) {
  const map = { addon: 'addons', world: 'worlds', 'skin-pack': 'skin-packs', 'texture-pack': 'texture-packs', mashup: 'mashups' };
  return map[key] || key + 's';
}

function buildApiFiles(products, categories, creators, stats, site, ROOT) {
  const apiDir = path.join(ROOT, 'api', 'v1');
  ensureDir(apiDir);

  // 1. Full catalog: api/v1/products.json
  const catalogData = {
    meta: {
      name: site.name,
      url: site.url,
      totalProducts: products.length,
      lastUpdated: new Date().toISOString().split('T')[0],
      apiVersion: '1.0'
    },
    products: products.map(toApiProduct)
  };
  fs.writeFileSync(path.join(apiDir, 'products.json'), JSON.stringify(catalogData, null, 2));

  // 2. Individual product files: api/v1/products/{slug}.json
  const productsDir = path.join(apiDir, 'products');
  ensureDir(productsDir);
  for (const p of products) {
    fs.writeFileSync(
      path.join(productsDir, `${p.slug}.json`),
      JSON.stringify(toApiProductFull(p), null, 2)
    );
  }

  // 3. Category files: api/v1/categories/{slug}.json
  const categoriesDir = path.join(apiDir, 'categories');
  ensureDir(categoriesDir);
  for (const cat of categories) {
    const catProducts = products.filter(p => p.category === cat.key);
    const catData = {
      category: cat.key,
      label: cat.labelPlural,
      description: cat.shortDescription,
      productCount: catProducts.length,
      products: catProducts.map(toApiProduct)
    };
    fs.writeFileSync(
      path.join(categoriesDir, `${cat.key}.json`),
      JSON.stringify(catData, null, 2)
    );
  }

  // 4. Creator files: api/v1/creators/{slug}.json
  const creatorsDir = path.join(apiDir, 'creators');
  ensureDir(creatorsDir);
  for (const creator of creators) {
    const creatorProducts = products.filter(p => p.creatorSlug === creator.slug);
    const creatorData = {
      ...creator,
      productCount: creatorProducts.length,
      products: creatorProducts.map(toApiProduct)
    };
    fs.writeFileSync(
      path.join(creatorsDir, `${creator.slug}.json`),
      JSON.stringify(creatorData, null, 2)
    );
  }

  // 5. Search index: api/v1/search-index.json (lightweight for client-side search)
  const searchIndex = products.map(p => ({
    s: p.slug,
    n: p.name,
    c: p.category,
    t: (p.tags || []).join(','),
    r: p.rating,
    p: p.price,
    cr: p.creator || ''
  }));
  fs.writeFileSync(
    path.join(apiDir, 'search-index.json'),
    JSON.stringify(searchIndex)
  );

  // 6. Stats: api/v1/stats.json
  fs.writeFileSync(
    path.join(apiDir, 'stats.json'),
    JSON.stringify(stats, null, 2)
  );

  return {
    files: 3 + products.length + categories.length + creators.length
  };
}

module.exports = { buildApiFiles };

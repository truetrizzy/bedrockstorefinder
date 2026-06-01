/**
 * seo-generator.js — Generates llms.txt, llms-full.txt, and sitemap
 */

const fs = require('fs');
const path = require('path');
const { today, interpolate } = require('./helpers');

function getCatSlug(key) {
  const map = { addon: 'addons', world: 'worlds', 'skin-pack': 'skin-packs', 'texture-pack': 'texture-packs', mashup: 'mashups' };
  return map[key] || key + 's';
}

function buildLlmsTxt(products, categories, site, ROOT) {
  const top20 = products.slice(0, 20);
  const lines = [
    `# ${site.name} — Minecraft Marketplace Directory\n`,
    `> ${site.description}\n`,
    `> API: ${site.apiBase || site.url + '/api/v1'}/products.json`,
    `> OpenAPI Spec: ${site.url}/api/openapi.yaml\n`,
    `## Top Products\n`
  ];

  for (const p of top20) {
    const catSlug = getCatSlug(p.category);
    lines.push(`- [${p.name}](${site.url}/${catSlug}/${p.slug}/): ${p.shortDesc} ${p.rating}-star rating with ${(p.reviewCount || 0).toLocaleString()}+ reviews. ${p.price} Minecoins.`);
  }

  lines.push(`\n## Categories\n`);
  for (const cat of categories) {
    lines.push(`- [${cat.labelPlural}](${site.url}/${cat.slug}/): ${cat.shortDescription}`);
  }

  lines.push(`\n## API Endpoints\n`);
  lines.push(`- [Full Catalog JSON](${site.url}/api/v1/products.json)`);
  lines.push(`- [Search Index](${site.url}/api/v1/search-index.json)`);
  lines.push(`- [Marketplace Stats](${site.url}/api/v1/stats.json)`);
  lines.push(`- [OpenAPI Spec](${site.url}/api/openapi.yaml)`);

  lines.push(`\n## Links\n`);
  lines.push(`- [Homepage](${site.url}/)`);
  lines.push(`- [Creators](${site.url}/creators/)`);
  lines.push(`- [About](${site.url}/about/)`);

  fs.writeFileSync(path.join(ROOT, 'llms.txt'), lines.join('\n') + '\n');
}

function buildLlmsFullTxt(products, categories, site, ROOT) {
  const lines = [
    `# ${site.name} — Complete Minecraft Marketplace Product Catalog\n`,
    `> ${site.description}\n`,
    `Total products: ${products.length}`,
    `Last updated: ${today()}\n`
  ];

  // Premium products get full detail
  const premium = products.filter(p => p.tier === 'premium');
  const standard = products.filter(p => p.tier !== 'premium');

  if (premium.length > 0) {
    lines.push(`## Featured Products (Detailed)\n`);
    for (const p of premium) {
      const catSlug = getCatSlug(p.category);
      lines.push(`### ${p.name}`);
      lines.push(`- **URL**: ${site.url}/${catSlug}/${p.slug}/`);
      lines.push(`- **Category**: ${p.category}`);
      lines.push(`- **Creator**: ${p.creator || 'Unknown'}`);
      lines.push(`- **Price**: ${p.price} Minecoins ($${p.priceUSD} USD)`);
      lines.push(`- **Rating**: ${p.rating} stars (${(p.reviewCount || 0).toLocaleString()} reviews)`);
      lines.push(`- **Downloads**: ${p.downloads || 'N/A'}`);
      lines.push(`- **Multiplayer**: ${p.multiplayer || 'N/A'}`);
      lines.push(`- **Minecraft Version**: ${p.minecraftVersion || 'Any'}`);
      lines.push(`\n${interpolate(p.longDesc || p.shortDesc, p)}\n`);
      if (p.features && p.features.length > 0) {
        lines.push(`**Key Features:**`);
        for (const f of p.features) { lines.push(`- ${f}`); }
        lines.push('');
      }
      if (p.faqs && p.faqs.length > 0) {
        lines.push(`**FAQ:**`);
        for (const faq of p.faqs) {
          lines.push(`- Q: ${faq.q}`);
          lines.push(`  A: ${interpolate(faq.a, p)}`);
        }
        lines.push('');
      }
    }
  }

  if (standard.length > 0) {
    lines.push(`\n## All Products (${standard.length} standard listings)\n`);
    lines.push(`| Name | Category | Creator | Rating | Price |`);
    lines.push(`|------|----------|---------|--------|-------|`);
    for (const p of standard) {
      lines.push(`| [${p.name}](${site.url}/${getCatSlug(p.category)}/${p.slug}/) | ${p.category} | ${p.creator || 'Unknown'} | ${p.rating || 'N/A'} | ${p.price} MC |`);
    }
  }

  fs.writeFileSync(path.join(ROOT, 'llms-full.txt'), lines.join('\n') + '\n');
}

function buildSitemap(products, categories, creators, site, ROOT) {
  const todayStr = today();
  const urls = [{ loc: `${site.url}/`, priority: '1.0' }];

  // Category pages
  for (const cat of categories) {
    urls.push({ loc: `${site.url}/${cat.slug}/`, priority: '0.9' });
  }

  // Product pages
  for (const p of products) {
    const catSlug = getCatSlug(p.category);
    urls.push({ loc: `${site.url}/${catSlug}/${p.slug}/`, priority: p.tier === 'premium' ? '0.9' : '0.7' });
  }

  // Creator pages
  urls.push({ loc: `${site.url}/creators/`, priority: '0.7' });
  for (const c of creators) {
    urls.push({ loc: `${site.url}/creators/${c.slug}/`, priority: '0.6' });
  }

  // Static pages
  urls.push({ loc: `${site.url}/guides/`, priority: '0.7' });
  urls.push({ loc: `${site.url}/about/`, priority: '0.5' });

  // If > 1000 URLs, split into sitemap index
  if (urls.length > 1000) {
    buildSitemapIndex(urls, todayStr, site, ROOT);
  } else {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${todayStr}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
    fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml);
  }

  return urls.length;
}

function buildSitemapIndex(urls, todayStr, site, ROOT) {
  const CHUNK_SIZE = 500;
  const chunks = [];
  for (let i = 0; i < urls.length; i += CHUNK_SIZE) {
    chunks.push(urls.slice(i, i + CHUNK_SIZE));
  }

  const sitemapDir = path.join(ROOT, 'sitemaps');
  const { ensureDir } = require('./helpers');
  ensureDir(sitemapDir);

  const sitemapFiles = [];
  for (let i = 0; i < chunks.length; i++) {
    const filename = `sitemap-${i + 1}.xml`;
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${chunks[i].map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${todayStr}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
    fs.writeFileSync(path.join(sitemapDir, filename), xml);
    sitemapFiles.push(`${site.url}/sitemaps/${filename}`);
  }

  // Write sitemap index
  const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapFiles.map(url => `  <sitemap>
    <loc>${url}</loc>
    <lastmod>${todayStr}</lastmod>
  </sitemap>`).join('\n')}
</sitemapindex>`;

  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), indexXml);
}

module.exports = { buildLlmsTxt, buildLlmsFullTxt, buildSitemap };

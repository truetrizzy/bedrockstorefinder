/**
 * creator-generator.js — Generates creator profile pages and creators listing
 */

const { e, ensureDir, today, formatDate, stars, formatReviewCount } = require('./helpers');
const { navHtml, breadcrumbHtml, productCardHtml, pageHtml } = require('./template');
const fs = require('fs');
const path = require('path');

function buildCreatorPages(creators, productsByCreator, site, ROOT) {
  // Build individual creator pages
  for (const creator of creators) {
    const products = productsByCreator[creator.slug] || [];
    const canonical = `${site.url}/creators/${creator.slug}/`;
    const todayStr = today();

    const body = `
    <div class="container">
      ${breadcrumbHtml([
        { href: '/', label: 'Home' },
        { href: '/creators/', label: 'Creators' },
        { label: creator.name }
      ])}
    </div>
    <section class="section">
      <div class="container">
        <h1>${e(creator.name)} — Minecraft Marketplace Creator</h1>
        <p class="last-updated">Last Updated: <time datetime="${todayStr}">${formatDate(todayStr)}</time></p>

        <div class="stats-bar">
          <div class="stat-item"><span class="stat-item__value">${creator.productCount || products.length}</span><span class="stat-item__label">Products</span></div>
          <div class="stat-item"><span class="stat-item__value">${creator.totalDownloads || 'N/A'}</span><span class="stat-item__label">Downloads</span></div>
          <div class="stat-item"><span class="stat-item__value">${creator.avgRating || 'N/A'}+</span><span class="stat-item__label">Avg Rating</span></div>
          <div class="stat-item"><span class="stat-item__value">${creator.totalReviews || 'N/A'}</span><span class="stat-item__label">Reviews</span></div>
        </div>

        ${creator.bio ? `<div class="product-content"><p>${e(creator.bio)}</p></div>` : ''}

        <h2>Products by ${e(creator.name)}</h2>
        <div class="product-grid">
          ${products.map(p => productCardHtml(p, 'h3')).join('\n          ')}
        </div>
      </div>
    </section>`;

    const html = pageHtml({
      title: `${creator.name} — Minecraft Marketplace Creator | ${site.name}`,
      description: `${creator.name} is a Minecraft Marketplace creator with ${creator.productCount || products.length} products and a ${creator.avgRating || 'N/A'}+ star average rating. Browse all products by ${creator.name}.`,
      canonical,
      jsonLd: [{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${site.url}/` },
          { "@type": "ListItem", position: 2, name: "Creators", item: `${site.url}/creators/` },
          { "@type": "ListItem", position: 3, name: creator.name, item: canonical }
        ]
      }],
      nav: navHtml('creators', site),
      body,
      site
    });

    ensureDir(path.join(ROOT, 'creators', creator.slug));
    fs.writeFileSync(path.join(ROOT, 'creators', creator.slug, 'index.html'), html);
  }

  // Build creators listing page
  const todayStr = today();
  const listBody = `
    <div class="container">
      ${breadcrumbHtml([{ href: '/', label: 'Home' }, { label: 'Creators' }])}
    </div>
    <section class="section">
      <div class="container">
        <h1>Minecraft Marketplace Creators</h1>
        <p><strong>Browse the creators behind the best Minecraft Bedrock content on the Marketplace.</strong> Each creator profile shows their full product catalog with ratings, reviews, and download counts.</p>
        <p class="last-updated">Last Updated: <time datetime="${todayStr}">${formatDate(todayStr)}</time></p>

        <div class="product-grid">
          ${creators.map(c => {
            const prods = productsByCreator[c.slug] || [];
            return `<a href="/creators/${c.slug}/" class="product-card">
              <div class="product-card__body">
                <h2 class="product-card__title">${e(c.name)}</h2>
                <p class="product-card__desc">${c.productCount || prods.length} products &bull; ${c.avgRating || 'N/A'}+ avg rating &bull; ${c.totalDownloads || 'N/A'} downloads</p>
              </div>
            </a>`;
          }).join('\n          ')}
        </div>
      </div>
    </section>`;

  const listHtml = pageHtml({
    title: `Minecraft Marketplace Creators | ${site.name}`,
    description: `Browse all Minecraft Marketplace creators. Find the best addon, world, skin pack, and texture pack creators with ratings and reviews.`,
    canonical: `${site.url}/creators/`,
    jsonLd: [{
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${site.url}/` },
        { "@type": "ListItem", position: 2, name: "Creators", item: `${site.url}/creators/` }
      ]
    }],
    nav: navHtml('creators', site),
    body: listBody,
    site
  });

  ensureDir(path.join(ROOT, 'creators'));
  fs.writeFileSync(path.join(ROOT, 'creators', 'index.html'), listHtml);

  return creators.length;
}

module.exports = { buildCreatorPages };

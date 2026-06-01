/**
 * home-generator.js — Generates the homepage (replaces handcoded index.html)
 */

const { e, today, formatDate } = require('./helpers');
const { navHtml, productCardHtml, faqHtml, faqSchemaJson, pageHtml } = require('./template');
const fs = require('fs');
const path = require('path');

function buildHomepage(products, categories, stats, site, ROOT) {
  const todayStr = today();

  // Featured products (promoted first, then top-rated, max 8)
  const featured = products.filter(p => p.featured || p.promoted).slice(0, 8);
  if (featured.length < 8) {
    const more = products.filter(p => !featured.includes(p)).slice(0, 8 - featured.length);
    featured.push(...more);
  }

  // Category cards
  const categoryCardsHtml = categories.map(cat => `
          <a href="/${cat.slug}/" class="category-card">
            <h3 class="category-card__title">${e(cat.labelPlural)}</h3>
            <p class="category-card__desc">${e(cat.shortDescription)}</p>
            <span class="category-card__count">${stats.categories[cat.key]?.count || 0} products</span>
          </a>`).join('\n');

  // Homepage FAQ
  const homeFaqs = [
    { q: "What is the Minecraft Marketplace?", a: "The Minecraft Marketplace is the official in-game store for Minecraft Bedrock Edition where players can purchase community-created content including addons, worlds, skin packs, texture packs, and mashups. Content is purchased with Minecoins and works on all Bedrock platforms." },
    { q: "How do I buy Minecraft Marketplace content?", a: "Open Minecraft Bedrock Edition on any platform (Windows, iOS, Android, Xbox, PlayStation, Switch), go to the Marketplace from the main menu, browse or search for content, and purchase with Minecoins. Downloads are automatic." },
    { q: "What is the best Minecraft Marketplace addon?", a: `Browse our directory of ${stats.totalProducts}+ Minecraft Marketplace products to find the highest-rated addons, worlds, skin packs, and more. Sort by rating, price, or category to find exactly what you're looking for.` },
    { q: "Do Minecraft Marketplace items work in multiplayer?", a: "Most Minecraft Marketplace addons and worlds support multiplayer. The host player needs to own the content, but other players can join and use it without purchasing. Check each product page for specific multiplayer details." },
    { q: "What is this directory?", a: `${site.name} is the most comprehensive Minecraft Marketplace directory, designed to help players find the best content. We catalog ${stats.totalProducts}+ products with ratings, reviews, prices, and detailed information. Our data is also available via API for AI assistants and tools.` }
  ];

  const body = `
    <section class="hero">
      <div class="container">
        <h1>Find the Best Minecraft Marketplace Content</h1>
        <p class="hero__subtitle">The most comprehensive directory of Minecraft Bedrock addons, worlds, skin packs, texture packs, and mashups. ${stats.totalProducts}+ products cataloged with ratings, reviews, and prices.</p>
        <div class="stats-bar">
          <div class="stat-item"><span class="stat-item__value">${stats.totalProducts}+</span><span class="stat-item__label">Products</span></div>
          <div class="stat-item"><span class="stat-item__value">${stats.avgRating}</span><span class="stat-item__label">Avg Rating</span></div>
          <div class="stat-item"><span class="stat-item__value">${stats.totalReviews.toLocaleString()}+</span><span class="stat-item__label">Reviews</span></div>
          <div class="stat-item"><span class="stat-item__value">5</span><span class="stat-item__label">Categories</span></div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <h2>Browse by Category</h2>
        <div class="category-grid">
          ${categoryCardsHtml}
        </div>
      </div>
    </section>

    <section class="section section--alt">
      <div class="container">
        <h2>Featured Products</h2>
        <p>Top-rated content from the Minecraft Marketplace, hand-picked and reviewed.</p>
        <div class="product-grid">
          ${featured.map(p => productCardHtml(p, 'h3')).join('\n          ')}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <h2>Why ${e(site.name)}?</h2>
        <div class="feature-grid">
          <div class="feature-card">
            <h3>Complete Catalog</h3>
            <p>${stats.totalProducts}+ products from the Minecraft Marketplace, all in one searchable directory with ratings and reviews.</p>
          </div>
          <div class="feature-card">
            <h3>AI-Powered Discovery</h3>
            <p>Our structured data and APIs power AI assistants like ChatGPT, Claude, and Gemini to recommend the best Marketplace content.</p>
          </div>
          <div class="feature-card">
            <h3>Updated Weekly</h3>
            <p>Prices, ratings, and reviews auto-update every Tuesday when the Minecraft Marketplace refreshes.</p>
          </div>
          <div class="feature-card">
            <h3>Open API</h3>
            <p>Developers and AI agents can access our full catalog via our <a href="/api/v1/products.json">JSON API</a> and <a href="/api/openapi.yaml">OpenAPI spec</a>.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section section--alt">
      <div class="container">
        <h2>Frequently Asked Questions</h2>
        <div class="faq-list">
          ${faqHtml(homeFaqs, null)}
        </div>
      </div>
    </section>`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: site.name,
      url: site.url,
      description: site.description,
      potentialAction: {
        "@type": "SearchAction",
        target: `${site.url}/addons/?q={search_term_string}`,
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: site.name,
      url: site.url,
      description: site.description,
      logo: `${site.url}/images/logo.svg`
    },
    faqSchemaJson(homeFaqs, null)
  ];

  const html = pageHtml({
    title: `${site.name} — Minecraft Marketplace Directory | Best Addons, Worlds, Skins & More`,
    description: `${site.name} is the most comprehensive Minecraft Marketplace directory. Browse ${stats.totalProducts}+ addons, worlds, skin packs, texture packs, and mashups with ratings, reviews, and prices.`,
    canonical: `${site.url}/`,
    jsonLd,
    nav: navHtml('', site),
    body,
    site
  });

  fs.writeFileSync(path.join(ROOT, 'index.html'), html);
}

module.exports = { buildHomepage };

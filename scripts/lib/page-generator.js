/**
 * page-generator.js — Generates individual product pages
 *
 * Two tiers:
 *   - Premium: Rich layout with features, reviews, FAQs, gallery, full JSON-LD
 *   - Standard: Minimal page with basic info and "View on Marketplace" CTA
 */

const { e, stars, interpolate, ensureDir, today, formatDate, formatReviewCount } = require('./helpers');
const { getCategorySlug, getCategoryLabel, navHtml, breadcrumbHtml, faqHtml, productCardHtml, faqSchemaJson, pageHtml } = require('./template');
const fs = require('fs');
const path = require('path');

function buildPremiumProductPage(p, allProducts, site, ROOT) {
  const catSlug = getCategorySlug(p.category);
  const catLabel = getCategoryLabel(p.category);
  const canonical = `${site.url}/${catSlug}/${p.slug}/`;
  const todayStr = today();

  const relatedProducts = allProducts
    .filter(r => r.slug !== p.slug && r.category === p.category)
    .slice(0, 3);
  if (relatedProducts.length < 3) {
    const more = allProducts.filter(r => r.slug !== p.slug && !relatedProducts.includes(r)).slice(0, 3 - relatedProducts.length);
    relatedProducts.push(...more);
  }

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${p.name} — Minecraft Bedrock ${catLabel}`,
    description: interpolate(p.longDesc || p.shortDesc, p),
    image: [`${site.url}/images/products/${p.images?.hero || p.thumbnail}`],
    brand: { "@type": "Brand", name: p.creator || 'Unknown' },
    category: `Minecraft Bedrock ${catLabel}`,
    offers: {
      "@type": "Offer",
      url: canonical,
      priceCurrency: "USD",
      price: p.priceUSD,
      availability: "https://schema.org/InStock",
      seller: { "@type": "Organization", name: p.creator || 'Unknown' }
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: String(p.rating || 0),
      reviewCount: String(p.reviewCount || 0),
      bestRating: "5",
      worstRating: "1"
    },
    review: (p.reviews || []).map(r => ({
      "@type": "Review",
      reviewRating: { "@type": "Rating", ratingValue: String(r.rating), bestRating: "5" },
      author: { "@type": "Person", name: r.author },
      reviewBody: r.text
    })),
    operatingSystem: "Minecraft Bedrock Edition",
    softwareVersion: p.version || '1.0',
    datePublished: p.datePublished || p.dateAdded,
    dateModified: todayStr
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${site.url}/` },
      { "@type": "ListItem", position: 2, name: catLabel + 's', item: `${site.url}/${catSlug}/` },
      { "@type": "ListItem", position: 3, name: p.name, item: canonical }
    ]
  };

  const jsonLd = [productSchema, breadcrumbSchema];
  if (p.faqs && p.faqs.length > 0) {
    jsonLd.push(faqSchemaJson(p.faqs, p));
  }

  const reviewsHtml = (p.reviews || []).map(r => `
          <div class="review-card">
            <div class="review-card__header">
              <span class="review-card__author">${e(r.author)}</span>
              <span class="review-card__stars" aria-label="${r.rating} out of 5 stars">${stars(r.rating)}</span>
            </div>
            <p class="review-card__text">${e(r.text)}</p>
            <p class="review-card__date">${r.date}</p>
          </div>`).join('\n');

  const featuresHtml = (p.features || []).map(f => {
    const parts = f.split(' — ');
    return `<li><strong>${e(parts[0])}</strong>${parts[1] ? ' &mdash; ' + e(parts[1]) : ''}</li>`;
  }).join('\n            ');

  const creatorLink = p.creatorSlug
    ? `<a href="/creators/${p.creatorSlug}/">${e(p.creator)}</a>`
    : e(p.creator || 'Unknown');

  const body = `
    <div class="container">
      ${breadcrumbHtml([
        { href: '/', label: 'Home' },
        { href: `/${catSlug}/`, label: catLabel + 's' },
        { label: p.name }
      ])}
    </div>
    <section class="product-hero">
      <div class="container">
        <div class="product-layout">
          <div>
            <div class="product-gallery">
              <img class="product-gallery__main" id="mainImage" src="/images/products/${p.images?.hero || p.thumbnail}" alt="${e(p.name)} ${catLabel} for Minecraft Bedrock Edition" width="800" height="450">
            </div>
            <h1>${e(p.name)} &mdash; ${e(p.tagline || 'Minecraft Bedrock ' + catLabel)}</h1>
            <p class="last-updated">Last Updated: <time datetime="${todayStr}">${formatDate(todayStr)}</time></p>
            <p><strong>${interpolate(p.longDesc || p.shortDesc, p)}</strong></p>
          </div>
          <aside class="product-sidebar">
            <div class="product-sidebar__price"><span class="coin" aria-hidden="true">&#9672;</span> ${p.price} Minecoins</div>
            <p style="font-size:0.85rem;color:var(--color-text-muted);margin-bottom:1rem;">Approximately $${p.priceUSD} USD</p>
            <div class="product-sidebar__rating">
              <span class="stars" aria-label="${p.rating} out of 5 stars">${stars(p.rating)}</span>
              <strong>${p.rating}</strong>
              <span class="count">(${p.reviewCount.toLocaleString()}+ reviews)</span>
            </div>
            <a href="${p.marketplaceUrl || 'https://www.minecraft.net/en-us/marketplace'}" class="btn btn--primary btn--lg" rel="noopener">Buy on Minecraft Marketplace</a>
            <div class="product-sidebar__meta">
              <div class="product-sidebar__meta-row"><span class="product-sidebar__meta-label">Creator</span><span class="product-sidebar__meta-value">${creatorLink}</span></div>
              <div class="product-sidebar__meta-row"><span class="product-sidebar__meta-label">Category</span><span class="product-sidebar__meta-value">${catLabel}</span></div>
              <div class="product-sidebar__meta-row"><span class="product-sidebar__meta-label">Minecraft Version</span><span class="product-sidebar__meta-value">${p.minecraftVersion || 'Any'}</span></div>
              ${p.multiplayer && p.multiplayer !== 'N/A' ? `<div class="product-sidebar__meta-row"><span class="product-sidebar__meta-label">Multiplayer</span><span class="product-sidebar__meta-value">${p.multiplayer}</span></div>` : ''}
              <div class="product-sidebar__meta-row"><span class="product-sidebar__meta-label">Downloads</span><span class="product-sidebar__meta-value">${p.downloads || 'N/A'}</span></div>
            </div>
            <div class="product-sidebar__meta">
              <span class="product-sidebar__meta-label" style="display:block;margin-bottom:0.5rem;">Platforms</span>
              <div class="platforms">${(p.platforms || []).map(pl => `<span class="platform-badge">${pl}</span>`).join('')}</div>
            </div>
          </aside>
        </div>
      </div>
    </section>
    <section class="section">
      <div class="container">
        <div class="product-content">
          ${featuresHtml ? `<h2>Key Features of ${e(p.name)}</h2><ul>${featuresHtml}</ul>` : ''}

          ${reviewsHtml ? `<h2>Player Reviews</h2>
          <p>${e(p.name)} maintains a ${p.rating}-star average across ${p.reviewCount.toLocaleString()}+ reviews on the Minecraft Marketplace.</p>
          ${reviewsHtml}` : ''}

          ${p.faqs && p.faqs.length > 0 ? `<h2>Frequently Asked Questions About ${e(p.name)}</h2>
          <div class="faq-list">
            ${faqHtml(p.faqs, p)}
          </div>` : ''}

          ${relatedProducts.length > 0 ? `<div class="related-products">
            <h2>You Might Also Like</h2>
            <div class="product-grid">
              ${relatedProducts.map(r => productCardHtml(r)).join('\n              ')}
            </div>
          </div>` : ''}
        </div>
      </div>
    </section>`;

  const html = pageHtml({
    title: `${p.name} — Best ${p.tagline || 'Minecraft Bedrock ' + catLabel} | ${site.name}`,
    description: `${p.name} is a top-rated ${catLabel.toLowerCase()} for Minecraft Bedrock Edition. ${p.shortDesc} ${p.rating} stars, ${p.reviewCount.toLocaleString()}+ reviews. ${p.price} Minecoins.`,
    canonical,
    ogType: 'product',
    ogImage: `${site.url}/images/products/${p.images?.hero || p.thumbnail}`,
    jsonLd,
    nav: navHtml(catSlug, site),
    body,
    site
  });

  const dir = path.join(ROOT, catSlug, p.slug);
  ensureDir(dir);
  fs.writeFileSync(path.join(dir, 'index.html'), html);
}

function buildStandardProductPage(p, allProducts, site, ROOT) {
  const catSlug = getCategorySlug(p.category);
  const catLabel = getCategoryLabel(p.category);
  const canonical = `${site.url}/${catSlug}/${p.slug}/`;
  const todayStr = today();

  const relatedProducts = allProducts
    .filter(r => r.slug !== p.slug && r.category === p.category)
    .slice(0, 3);

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${site.url}/` },
      { "@type": "ListItem", position: 2, name: catLabel + 's', item: `${site.url}/${catSlug}/` },
      { "@type": "ListItem", position: 3, name: p.name, item: canonical }
    ]
  };

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${p.name} — Minecraft Bedrock ${catLabel}`,
    description: p.shortDesc,
    image: [`${site.url}/images/products/${p.thumbnail || 'placeholder.svg'}`],
    brand: { "@type": "Brand", name: p.creator || 'Unknown' },
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: p.priceUSD || '0.00',
      availability: "https://schema.org/InStock"
    },
    aggregateRating: p.rating ? {
      "@type": "AggregateRating",
      ratingValue: String(p.rating),
      reviewCount: String(p.reviewCount || 0),
      bestRating: "5",
      worstRating: "1"
    } : undefined
  };

  const creatorLink = p.creatorSlug
    ? `<a href="/creators/${p.creatorSlug}/">${e(p.creator)}</a>`
    : e(p.creator || 'Unknown');

  const body = `
    <div class="container">
      ${breadcrumbHtml([
        { href: '/', label: 'Home' },
        { href: `/${catSlug}/`, label: catLabel + 's' },
        { label: p.name }
      ])}
    </div>
    <section class="section">
      <div class="container">
        <div class="product-layout">
          <div class="product-content">
            <img src="/images/products/${p.thumbnail || 'placeholder.svg'}" alt="${e(p.name)} ${catLabel} for Minecraft Bedrock" width="800" height="450" style="width:100%;border-radius:var(--radius-lg);margin-bottom:1.5rem;">
            <h1>${e(p.name)} &mdash; Minecraft Bedrock ${e(catLabel)}</h1>
            <p class="last-updated">Last Updated: <time datetime="${todayStr}">${formatDate(todayStr)}</time></p>
            <p><strong>${e(p.shortDesc)}</strong></p>
            <p>Created by ${creatorLink}. Rated ${p.rating} stars across ${(p.reviewCount || 0).toLocaleString()}+ reviews on the Minecraft Marketplace. Available for ${p.price} Minecoins (approximately $${p.priceUSD || '?.??'} USD).</p>
            <p>Compatible with Minecraft Bedrock Edition ${p.minecraftVersion || ''} on ${(p.platforms || []).join(', ') || 'all platforms'}.</p>
            <div style="margin:2rem 0;text-align:center;">
              <a href="${p.marketplaceUrl || 'https://www.minecraft.net/en-us/marketplace'}" class="btn btn--primary btn--lg" rel="noopener">View on Minecraft Marketplace</a>
            </div>
          </div>
          <aside class="product-sidebar">
            <div class="product-sidebar__price"><span class="coin" aria-hidden="true">&#9672;</span> ${p.price} Minecoins</div>
            <div class="product-sidebar__rating">
              <span class="stars" aria-label="${p.rating} out of 5 stars">${stars(p.rating || 0)}</span>
              <strong>${p.rating || 'N/A'}</strong>
              <span class="count">(${(p.reviewCount || 0).toLocaleString()} reviews)</span>
            </div>
            <div class="product-sidebar__meta">
              <div class="product-sidebar__meta-row"><span class="product-sidebar__meta-label">Creator</span><span class="product-sidebar__meta-value">${creatorLink}</span></div>
              <div class="product-sidebar__meta-row"><span class="product-sidebar__meta-label">Category</span><span class="product-sidebar__meta-value">${catLabel}</span></div>
              <div class="product-sidebar__meta-row"><span class="product-sidebar__meta-label">Version</span><span class="product-sidebar__meta-value">${p.minecraftVersion || 'Any'}</span></div>
            </div>
          </aside>
        </div>
        ${relatedProducts.length > 0 ? `<div class="related-products">
          <h2>Similar ${catLabel}s</h2>
          <div class="product-grid">
            ${relatedProducts.map(r => productCardHtml(r)).join('\n            ')}
          </div>
        </div>` : ''}
      </div>
    </section>`;

  const html = pageHtml({
    title: `${p.name} — Minecraft Bedrock ${catLabel} | ${site.name}`,
    description: `${p.name} by ${p.creator || 'Unknown'}. ${p.shortDesc} ${p.rating} stars, ${(p.reviewCount || 0).toLocaleString()} reviews. ${p.price} Minecoins.`,
    canonical,
    ogType: 'product',
    jsonLd: [productSchema, breadcrumbSchema],
    nav: navHtml(catSlug, site),
    body,
    site
  });

  const dir = path.join(ROOT, catSlug, p.slug);
  ensureDir(dir);
  fs.writeFileSync(path.join(dir, 'index.html'), html);
}

function buildProductPages(products, premiumSlugs, site, ROOT) {
  let premiumCount = 0;
  let standardCount = 0;

  for (const p of products) {
    if (premiumSlugs.has(p.slug)) {
      buildPremiumProductPage(p, products, site, ROOT);
      premiumCount++;
    } else {
      buildStandardProductPage(p, products, site, ROOT);
      standardCount++;
    }
  }

  return { premiumCount, standardCount };
}

module.exports = { buildProductPages, buildPremiumProductPage, buildStandardProductPage };

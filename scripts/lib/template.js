/**
 * template.js — Shared HTML template parts
 */

const { e, stars, formatReviewCount, interpolate } = require('./helpers');

/**
 * Category metadata lookup — loaded lazily from categories.json data
 */
let _categories = null;

function setCategories(cats) {
  _categories = cats;
}

function getCategoryByKey(key) {
  if (!_categories) return null;
  return _categories.find(c => c.key === key);
}

function getCategorySlug(key) {
  const cat = getCategoryByKey(key);
  return cat ? cat.slug : key + 's';
}

function getCategoryLabel(key) {
  const cat = getCategoryByKey(key);
  return cat ? cat.label : key;
}

function getCategoryTagClass(key) {
  const cat = getCategoryByKey(key);
  return cat ? cat.tagClass : 'tag--default';
}

// --- HTML Parts ---

function navHtml(activeSlug, site) {
  const links = [
    { href: '/addons/', label: 'Addons', key: 'addons' },
    { href: '/worlds/', label: 'Worlds', key: 'worlds' },
    { href: '/skin-packs/', label: 'Skin Packs', key: 'skin-packs' },
    { href: '/texture-packs/', label: 'Texture Packs', key: 'texture-packs' },
    { href: '/mashups/', label: 'Mashups', key: 'mashups' },
    { href: '/creators/', label: 'Creators', key: 'creators' },
    { href: '/guides/', label: 'Guides', key: 'guides' },
    { href: '/about/', label: 'About', key: 'about' }
  ];
  const linkHtml = links.map(l =>
    `<a href="${l.href}" class="nav__link${l.key === activeSlug ? ' nav__link--active' : ''}">${l.label}</a>`
  ).join('\n          ');

  return `<nav class="nav" aria-label="Main navigation">
    <div class="nav__inner">
      <a href="/" class="nav__logo" aria-label="${e(site.name)} Home">
        <span class="nav__logo-icon" aria-hidden="true">&#9935;</span>
        ${e(site.name)}
      </a>
      <button class="nav__toggle" aria-label="Toggle menu" aria-expanded="false" onclick="document.querySelector('.nav__links').classList.toggle('nav__links--open'); this.setAttribute('aria-expanded', this.getAttribute('aria-expanded') === 'true' ? 'false' : 'true');">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>
      <div class="nav__links">
          ${linkHtml}
      </div>
    </div>
  </nav>`;
}

function footerHtml(site) {
  return `<footer class="footer">
    <div class="container">
      <div class="footer__grid">
        <div class="footer__brand">
          <a href="/" class="nav__logo"><span class="nav__logo-icon" aria-hidden="true">&#9935;</span> ${e(site.name)}</a>
          <p>The most comprehensive Minecraft Marketplace directory. Browse addons, worlds, skin packs, texture packs, and mashups &mdash; all from the official Minecraft Marketplace.</p>
        </div>
        <div><h4 class="footer__heading">Categories</h4><ul class="footer__links"><li><a href="/addons/">Addons</a></li><li><a href="/worlds/">Worlds</a></li><li><a href="/skin-packs/">Skin Packs</a></li><li><a href="/texture-packs/">Texture Packs</a></li><li><a href="/mashups/">Mashups</a></li></ul></div>
        <div><h4 class="footer__heading">Resources</h4><ul class="footer__links"><li><a href="/creators/">Creators</a></li><li><a href="/guides/">Guides</a></li><li><a href="/about/">About</a></li><li><a href="/api/v1/products.json">API</a></li></ul></div>
        <div><h4 class="footer__heading">Minecraft</h4><ul class="footer__links"><li><a href="https://www.minecraft.net/en-us/marketplace" rel="noopener">Minecraft Marketplace</a></li><li><a href="https://www.minecraft.net/" rel="noopener">Minecraft.net</a></li></ul></div>
      </div>
      <div class="footer__bottom"><span>&copy; ${new Date().getFullYear()} ${e(site.name)}. All rights reserved.</span><span>Not affiliated with Mojang AB or Microsoft. Minecraft is a trademark of Mojang AB.</span></div>
    </div>
  </footer>`;
}

function breadcrumbHtml(items) {
  return `<nav class="breadcrumb" aria-label="Breadcrumb">
        ${items.map((item, i) =>
          i < items.length - 1
            ? `<a href="${item.href}">${item.label}</a><span class="breadcrumb__sep" aria-hidden="true">/</span>`
            : `<span aria-current="page">${item.label}</span>`
        ).join('\n        ')}
      </nav>`;
}

function faqHtml(faqs, product) {
  return faqs.map((faq, i) => {
    const answer = product ? interpolate(faq.a, product) : faq.a;
    return `<div class="faq-item${i === 0 ? ' faq-item--open' : ''}">
              <button class="faq-question" aria-expanded="${i === 0 ? 'true' : 'false'}" onclick="this.parentElement.classList.toggle('faq-item--open'); this.setAttribute('aria-expanded', this.getAttribute('aria-expanded') === 'true' ? 'false' : 'true');">
                ${e(faq.q)}
                <span class="faq-question__icon" aria-hidden="true">&#9660;</span>
              </button>
              <div class="faq-answer" role="region"><p>${e(answer)}</p></div>
            </div>`;
  }).join('\n          ');
}

function productCardHtml(p, headingTag = 'h3') {
  const catSlug = getCategorySlug(p.category);
  const catLabel = getCategoryLabel(p.category);
  const tagClass = getCategoryTagClass(p.category);

  const creatorBadge = p.promoted
    ? `<span class="product-card__creator product-card__creator--promoted">${e(p.creator || 'Unknown')}</span>`
    : (p.creator ? `<span class="product-card__creator">${e(p.creator)}</span>` : '');

  return `<a href="/${catSlug}/${p.slug}/" class="product-card">
            <img class="product-card__image" src="/images/products/${p.thumbnail || p.images?.thumb || 'placeholder.svg'}" alt="${e(p.name)} ${catLabel} for Minecraft Bedrock Edition" width="400" height="225" loading="lazy">
            <div class="product-card__body">
              <span class="product-card__category ${tagClass}">${catLabel}</span>
              ${creatorBadge}
              <${headingTag} class="product-card__title">${e(p.name)}</${headingTag}>
              <p class="product-card__desc">${e(p.shortDesc)}</p>
              <div class="product-card__footer">
                <span class="product-card__price"><span class="coin" aria-hidden="true">&#9672;</span> ${p.price} Minecoins</span>
                <span class="product-card__rating"><span class="stars" aria-label="${p.rating} out of 5 stars">${stars(p.rating)}</span> ${p.rating} (${formatReviewCount(p.reviewCount)})</span>
              </div>
            </div>
          </a>`;
}

function faqSchemaJson(faqs, product) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(faq => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: product ? interpolate(faq.a, product) : faq.a
      }
    }))
  };
}

function pageHtml({ title, description, canonical, ogType, ogImage, jsonLd, nav, body, site }) {
  const ldScripts = (jsonLd || []).map(ld =>
    `<script type="application/ld+json">\n  ${JSON.stringify(ld, null, 2)}\n  </script>`
  ).join('\n  ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${e(title)}</title>
  <meta name="description" content="${e(description)}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:title" content="${e(title)}">
  <meta property="og:description" content="${e(description)}">
  <meta property="og:type" content="${ogType || 'website'}">
  <meta property="og:url" content="${canonical}">
  ${ogImage ? `<meta property="og:image" content="${ogImage}">` : ''}
  <meta property="og:site_name" content="${e(site.name)}">
  <link rel="stylesheet" href="/css/styles.css">
  ${ldScripts}
</head>
<body>
  ${nav}
  <main>
    ${body}
  </main>
  ${footerHtml(site)}
  <script src="/js/main.js"></script>
</body>
</html>`;
}

module.exports = {
  setCategories,
  getCategoryByKey,
  getCategorySlug,
  getCategoryLabel,
  getCategoryTagClass,
  navHtml,
  footerHtml,
  breadcrumbHtml,
  faqHtml,
  productCardHtml,
  faqSchemaJson,
  pageHtml
};

/**
 * category-generator.js — Generates category listing pages with pagination
 */

const { e, ensureDir, today, formatDate } = require('./helpers');
const { navHtml, breadcrumbHtml, faqHtml, productCardHtml, faqSchemaJson, pageHtml } = require('./template');
const fs = require('fs');
const path = require('path');

const PRODUCTS_PER_PAGE = 50;

function buildCategoryPages(categories, productsByCategory, site, ROOT) {
  let totalPages = 0;

  for (const cat of categories) {
    const products = productsByCategory[cat.key] || [];
    const totalProductPages = Math.ceil(products.length / PRODUCTS_PER_PAGE) || 1;

    for (let page = 1; page <= totalProductPages; page++) {
      const start = (page - 1) * PRODUCTS_PER_PAGE;
      const pageProducts = products.slice(start, start + PRODUCTS_PER_PAGE);
      const isFirstPage = page === 1;
      const todayStr = today();

      const canonical = isFirstPage
        ? `${site.url}/${cat.slug}/`
        : `${site.url}/${cat.slug}/page/${page}/`;

      // Pagination HTML
      let paginationHtml = '';
      if (totalProductPages > 1) {
        const links = [];
        if (page > 1) {
          const prevUrl = page === 2 ? `/${cat.slug}/` : `/${cat.slug}/page/${page - 1}/`;
          links.push(`<a href="${prevUrl}" class="pagination__link">&laquo; Previous</a>`);
        }
        for (let i = 1; i <= totalProductPages; i++) {
          const url = i === 1 ? `/${cat.slug}/` : `/${cat.slug}/page/${i}/`;
          links.push(i === page
            ? `<span class="pagination__current">${i}</span>`
            : `<a href="${url}" class="pagination__link">${i}</a>`
          );
        }
        if (page < totalProductPages) {
          links.push(`<a href="/${cat.slug}/page/${page + 1}/" class="pagination__link">Next &raquo;</a>`);
        }
        paginationHtml = `<nav class="pagination" aria-label="Page navigation">${links.join(' ')}</nav>`;
      }

      // FAQ section (only on first page)
      const faqSection = isFirstPage && cat.faqs && cat.faqs.length > 0
        ? `<div class="mt-4">
          <h2>Frequently Asked Questions About Minecraft ${cat.labelPlural}</h2>
          <div class="faq-list">
            ${faqHtml(cat.faqs, null)}
          </div>
        </div>`
        : '';

      const body = `
    <div class="container">
      ${breadcrumbHtml([{ href: '/', label: 'Home' }, { label: cat.labelPlural }])}
    </div>
    <section class="section">
      <div class="container">
        <h1>Minecraft Bedrock ${cat.labelPlural}${!isFirstPage ? ` — Page ${page}` : ''}</h1>
        ${isFirstPage ? `<p><strong>${e(cat.description)}</strong></p>` : ''}
        <p class="last-updated">Last Updated: <time datetime="${todayStr}">${formatDate(todayStr)}</time></p>
        <div class="filter-bar">
          <span class="filter-bar__count">Showing ${pageProducts.length} of ${products.length} ${cat.labelPlural.toLowerCase()}</span>
          <div class="filter-bar__sort">
            <label for="sortSelect">Sort by:</label>
            <select id="sortSelect">
              <option value="popular">Most Popular</option>
              <option value="rating">Highest Rated</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>
        <div class="product-grid">
          ${pageProducts.map(p => productCardHtml(p, 'h2')).join('\n          ')}
        </div>
        ${paginationHtml}
        ${faqSection}
      </div>
    </section>`;

      // JSON-LD
      const jsonLd = [{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${site.url}/` },
          { "@type": "ListItem", position: 2, name: cat.labelPlural, item: `${site.url}/${cat.slug}/` }
        ]
      }];

      if (isFirstPage && cat.faqs && cat.faqs.length > 0) {
        jsonLd.push(faqSchemaJson(cat.faqs, null));
      }

      const html = pageHtml({
        title: `Minecraft Bedrock ${cat.labelPlural}${!isFirstPage ? ' — Page ' + page : ''} | ${site.name}`,
        description: cat.shortDescription + ` Browse ${products.length}+ ${cat.labelPlural.toLowerCase()} on ${site.name}.`,
        canonical,
        jsonLd,
        nav: navHtml(cat.slug, site),
        body,
        site
      });

      if (isFirstPage) {
        ensureDir(path.join(ROOT, cat.slug));
        fs.writeFileSync(path.join(ROOT, cat.slug, 'index.html'), html);
      } else {
        ensureDir(path.join(ROOT, cat.slug, 'page', String(page)));
        fs.writeFileSync(path.join(ROOT, cat.slug, 'page', String(page), 'index.html'), html);
      }
      totalPages++;
    }
  }

  return totalPages;
}

module.exports = { buildCategoryPages };

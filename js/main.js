/* Pickaxe Studios — Progressive Enhancement
   This JS is optional. The site works fully without it.
   It adds: image gallery switching, smooth FAQ toggles, and sort filtering. */

(function () {
  'use strict';

  // Image gallery: thumbnail click updates main image + active state
  document.querySelectorAll('.product-gallery__thumb').forEach(function (thumb) {
    thumb.addEventListener('click', function () {
      var gallery = this.closest('.product-gallery');
      if (!gallery) return;
      var main = gallery.querySelector('.product-gallery__main');
      if (main) main.src = this.src;
      gallery.querySelectorAll('.product-gallery__thumb').forEach(function (t) {
        t.classList.remove('product-gallery__thumb--active');
      });
      this.classList.add('product-gallery__thumb--active');
    });
  });

  // Sort select: basic client-side sorting for product grids
  var sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', function () {
      var grid = document.querySelector('.product-grid');
      if (!grid) return;
      var cards = Array.from(grid.querySelectorAll('.product-card'));

      cards.sort(function (a, b) {
        switch (sortSelect.value) {
          case 'rating':
            return parseRating(b) - parseRating(a);
          case 'price-low':
            return parsePrice(a) - parsePrice(b);
          case 'price-high':
            return parsePrice(b) - parsePrice(a);
          case 'newest':
            cards.reverse();
            return 0;
          default:
            return 0;
        }
      });

      cards.forEach(function (card) {
        grid.appendChild(card);
      });
    });
  }

  function parseRating(card) {
    var el = card.querySelector('.product-card__rating');
    if (!el) return 0;
    var match = el.textContent.match(/([\d.]+)/);
    return match ? parseFloat(match[1]) : 0;
  }

  function parsePrice(card) {
    var el = card.querySelector('.product-card__price');
    if (!el) return 0;
    var match = el.textContent.match(/([\d,]+)/);
    return match ? parseInt(match[1].replace(',', ''), 10) : 0;
  }
})();

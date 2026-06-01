/**
 * helpers.js — Shared utility functions for the build pipeline
 */

const fs = require('fs');

function stars(rating) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5 ? 1 : 0;
  return '&#9733;'.repeat(full) + (half ? '&#9734;' : '') + '&#9734;'.repeat(5 - full - half);
}

function formatReviewCount(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

function interpolate(str, product) {
  if (!str || !product) return str || '';
  return str
    .replace(/\{rating\}/g, product.rating ?? '')
    .replace(/\{reviewCount\}/g, (product.reviewCount ?? 0).toLocaleString())
    .replace(/\{price\}/g, product.price ?? '')
    .replace(/\{minecraftVersion\}/g, product.minecraftVersion || '')
    .replace(/\{name\}/g, product.name || '');
}

function e(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

module.exports = {
  stars,
  formatReviewCount,
  interpolate,
  e,
  ensureDir,
  slugify,
  today,
  formatDate
};

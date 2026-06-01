/**
 * discovery-generator.js — Generates agent discovery files
 *
 * Creates:
 *   - /.well-known/ai-plugin.json (OpenAI GPT Actions)
 *   - /.well-known/agent-card.json (A2A Protocol)
 *   - /api/openapi.yaml (OpenAPI 3.1 spec)
 *   - /_headers (CORS for GitHub Pages)
 */

const fs = require('fs');
const path = require('path');
const { ensureDir } = require('./helpers');

function buildDiscoveryFiles(site, stats, ROOT) {
  // --- .well-known/ai-plugin.json ---
  const wellKnownDir = path.join(ROOT, '.well-known');
  ensureDir(wellKnownDir);

  const aiPlugin = {
    schema_version: "v1",
    name_for_human: site.name,
    name_for_model: "minecraft_marketplace_directory",
    description_for_human: site.description,
    description_for_model: `A comprehensive directory of ${stats.totalProducts}+ Minecraft Marketplace products for Bedrock Edition. Use this to search for, compare, and get details about Minecraft addons, worlds, skin packs, texture packs, and mashups. All products include ratings, reviews, prices (in Minecoins), and direct Marketplace links. Data updates weekly.`,
    auth: { type: "none" },
    api: {
      type: "openapi",
      url: `${site.url}/api/openapi.yaml`
    },
    logo_url: `${site.url}/images/logo.svg`,
    contact_email: "contact@bedrockstorefinder.com",
    legal_info_url: `${site.url}/about/`
  };

  fs.writeFileSync(
    path.join(wellKnownDir, 'ai-plugin.json'),
    JSON.stringify(aiPlugin, null, 2)
  );

  // --- .well-known/agent-card.json (A2A Protocol) ---
  const agentCard = {
    name: site.name,
    description: site.description,
    url: site.url,
    version: "1.0.0",
    capabilities: {
      streaming: false,
      pushNotifications: false
    },
    protocols: [
      {
        type: "openapi",
        url: `${site.url}/api/openapi.yaml`,
        description: "RESTful JSON API for product data"
      },
      {
        type: "llms-txt",
        url: `${site.url}/llms.txt`,
        fullUrl: `${site.url}/llms-full.txt`,
        description: "LLM-optimized product catalog in markdown"
      }
    ],
    defaultInputModes: ["text/plain"],
    defaultOutputModes: ["application/json"],
    skills: [
      {
        id: "search-products",
        name: "Search Minecraft Marketplace Products",
        description: `Search across ${stats.totalProducts}+ Minecraft Marketplace products by name, category, rating, or price.`,
        tags: ["minecraft", "marketplace", "search", "products"]
      },
      {
        id: "compare-products",
        name: "Compare Minecraft Products",
        description: "Compare up to 4 Minecraft Marketplace products side by side with ratings, prices, and features.",
        tags: ["minecraft", "compare", "products"]
      }
    ]
  };

  // Add MCP endpoint if configured
  if (site.mcpEndpoint) {
    agentCard.protocols.push({
      type: "mcp",
      url: site.mcpEndpoint,
      description: "Model Context Protocol server for direct AI agent queries"
    });
  }

  fs.writeFileSync(
    path.join(wellKnownDir, 'agent-card.json'),
    JSON.stringify(agentCard, null, 2)
  );

  // --- api/openapi.yaml ---
  const apiDir = path.join(ROOT, 'api');
  ensureDir(apiDir);

  const openApiSpec = `openapi: "3.1.0"
info:
  title: ${site.name} API
  description: |
    Comprehensive Minecraft Marketplace product directory API.
    Browse, search, and compare ${stats.totalProducts}+ products including
    addons, worlds, skin packs, texture packs, and mashups for
    Minecraft Bedrock Edition.

    All endpoints return static JSON files. No authentication required.
    Data updates weekly (every Tuesday).
  version: "1.0.0"
  contact:
    name: ${site.name}
    url: ${site.url}

servers:
  - url: ${site.url}/api/v1
    description: Production (GitHub Pages CDN)

paths:
  /products.json:
    get:
      operationId: listAllProducts
      summary: List all Minecraft Marketplace products
      description: Returns the complete catalog of ${stats.totalProducts}+ products with names, categories, ratings, prices, and descriptions.
      responses:
        "200":
          description: Full product catalog
          content:
            application/json:
              schema:
                type: object
                properties:
                  meta:
                    type: object
                    properties:
                      totalProducts: { type: integer }
                      lastUpdated: { type: string, format: date }
                  products:
                    type: array
                    items:
                      $ref: "#/components/schemas/Product"

  /products/{slug}.json:
    get:
      operationId: getProduct
      summary: Get a specific product by slug
      description: Returns full details for a single product including description, features, reviews, FAQs, and pricing.
      parameters:
        - name: slug
          in: path
          required: true
          description: Product URL slug (e.g. "skyblock-ultimate")
          schema:
            type: string
      responses:
        "200":
          description: Product details
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ProductFull"

  /categories/{category}.json:
    get:
      operationId: getCategory
      summary: Get products by category
      description: Returns all products in a specific category (addon, world, skin-pack, texture-pack, mashup).
      parameters:
        - name: category
          in: path
          required: true
          schema:
            type: string
            enum: [addon, world, skin-pack, texture-pack, mashup]
      responses:
        "200":
          description: Category products
          content:
            application/json:
              schema:
                type: object
                properties:
                  category: { type: string }
                  productCount: { type: integer }
                  products:
                    type: array
                    items:
                      $ref: "#/components/schemas/Product"

  /creators/{slug}.json:
    get:
      operationId: getCreator
      summary: Get a creator profile and their products
      parameters:
        - name: slug
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Creator profile with products

  /search-index.json:
    get:
      operationId: getSearchIndex
      summary: Get lightweight search index
      description: Returns a compact array for client-side searching. Each entry has slug, name, category, tags, rating, price, and creator.
      responses:
        "200":
          description: Search index array

  /stats.json:
    get:
      operationId: getStats
      summary: Get marketplace statistics
      description: Returns aggregate statistics including total products, average ratings, price ranges, and per-category breakdowns.
      responses:
        "200":
          description: Marketplace statistics

components:
  schemas:
    Product:
      type: object
      properties:
        slug: { type: string }
        name: { type: string }
        creator: { type: string }
        category: { type: string, enum: [addon, world, skin-pack, texture-pack, mashup] }
        price: { type: integer, description: "Price in Minecoins" }
        priceUSD: { type: string }
        rating: { type: number }
        reviewCount: { type: integer }
        shortDesc: { type: string }
        tags: { type: array, items: { type: string } }
        tier: { type: string, enum: [standard, premium] }
        featured: { type: boolean }

    ProductFull:
      allOf:
        - $ref: "#/components/schemas/Product"
        - type: object
          properties:
            longDesc: { type: string }
            features: { type: array, items: { type: string } }
            reviews:
              type: array
              items:
                type: object
                properties:
                  author: { type: string }
                  rating: { type: integer }
                  text: { type: string }
            faqs:
              type: array
              items:
                type: object
                properties:
                  question: { type: string }
                  answer: { type: string }
            multiplayer: { type: string }
            version: { type: string }
`;

  fs.writeFileSync(path.join(apiDir, 'openapi.yaml'), openApiSpec);

  // --- _headers (CORS for GitHub Pages) ---
  const headers = `# CORS headers for API endpoints
/api/*
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, OPTIONS
  Access-Control-Allow-Headers: Content-Type
  Content-Type: application/json

/.well-known/*
  Access-Control-Allow-Origin: *
  Content-Type: application/json

/llms.txt
  Access-Control-Allow-Origin: *
  Content-Type: text/plain; charset=utf-8

/llms-full.txt
  Access-Control-Allow-Origin: *
  Content-Type: text/plain; charset=utf-8
`;

  fs.writeFileSync(path.join(ROOT, '_headers'), headers);

  return 4; // files created
}

module.exports = { buildDiscoveryFiles };

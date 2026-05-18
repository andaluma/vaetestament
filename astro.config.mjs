// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

// VAEtestament marketing site - Astro 5 config
// Output: static HTML to ./dist, served by Cloudflare Workers Static Assets.
// Multi-language: NL only on this domain. EN/ES go to separate domains
// per LOCALIZATION_PLAYBOOK.md. Hreflang to those domains added later.
export default defineConfig({
  site: 'https://vaetestament.nl',
  output: 'static',
  outDir: './dist',
  trailingSlash: 'ignore',

  integrations: [
    sitemap({
      filter: (page) =>
        !page.includes('/bedankt') &&
        !page.includes('/aanmelding-bevestigd') &&
        !page.includes('/baraca') &&
        !page.includes('/BARACA_'),
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
      serialize: (item) => {
        // EN homepage: /en/ -> uaepropertywills.com/
        if (item.url.includes('/en/')) {
          item.url = item.url.replace('https://vaetestament.nl/en/', 'https://uaepropertywills.com/');
          return item;
        }
        // EN articles: /articles/ -> uaepropertywills.com/articles/
        if (item.url.includes('/articles/') || item.url.endsWith('/articles')) {
          item.url = item.url.replace('https://vaetestament.nl/', 'https://uaepropertywills.com/');
          return item;
        }
        return item;
      },
    }),
    mdx(),
  ],

  build: {
    // Keep clean asset filenames - easier to reason about in DevTools and
    // matches the current static-asset deploy's feel.
    assets: '_assets',
  },

  vite: {
    build: {
      // Inline small assets to save HTTP requests; Cloudflare's edge handles
      // the rest.
      assetsInlineLimit: 4096,
    },
  },
});

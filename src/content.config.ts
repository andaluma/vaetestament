import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// VAEtestament article content collection.
//
// Source files live in `src/content/articles/nl/*.md`. Frontmatter is
// validated against the schema below — build fails fast if an article is
// missing a field, which is exactly what we want for SEO/AEO consistency.
//
// EN and ES will live on separate domains (per LOCALIZATION_PLAYBOOK.md),
// so this collection only models the Dutch corpus. Future EN/ES sites can
// reuse the same schema definition by copying this file.

const articles = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/articles/nl' }),
  schema: z.object({
    title: z.string(),
    slug: z.string().optional(), // derived from filename if absent
    meta_description: z.string().max(160),
    keywords: z.array(z.string()).default([]),

    publish_date: z.coerce.date(),
    updated_date: z.coerce.date().optional(),
    status: z.enum(['draft', 'published']).default('draft'),

    author: z.string().default('André van Wijngaarden'),

    // Funnel cluster — drives the index page grouping + cross-references.
    // Funnel cluster. Optional during the D1→D2 migration; required from D2.
    cluster: z
      .enum(['waarom', 'hoe', 'keuze'])
      .optional()
      .describe(
        'waarom = Waarom dit telt, hoe = Hoe het werkt, keuze = Welke keuze past bij u',
      ),

    // Schema.org type for JSON-LD on this page. Article is the safe default;
    // some pieces could justify FAQPage as primary if they are pure Q&A.
    schema_type: z.enum(['Article', 'FAQPage']).default('Article'),

    // Related-article slugs rendered as the "Gerelateerde artikelen" block.
    // Validated at build: every slug must exist in the collection.
    related: z.array(z.string()).default([]),

    // Optional FAQ block rendered at the end of the article + emitted as
    // FAQPage JSON-LD for AI extraction.
    faq: z
      .array(
        z.object({
          q: z.string(),
          a: z.string(),
        }),
      )
      .default([]),

    // Linked FAQ entry on the landing page — bidirectional reference.
    linked_landing_faq: z.string().optional(),
  }),
});

export const collections = { articles };

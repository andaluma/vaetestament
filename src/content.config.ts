import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// VAEtestament article content collections.
//
// Each locale has its own collection pointing at src/content/articles/<locale>/.
// The schema is shared so all locales validate identically. To add a new
// locale: copy the defineCollection call, point base at the new directory,
// add the export, and drop translated .md files in the folder.
//
// Current locales: nl, en. Spanish (es) can be added the same way.

const articleSchema = z.object({
  title: z.string(),
  slug: z.string().optional(),
  meta_description: z.string().max(160),
  keywords: z.array(z.string()).default([]),

  publish_date: z.coerce.date(),
  updated_date: z.coerce.date().optional(),
  status: z.enum(['draft', 'published']).default('draft'),

  author: z.string().default('André van Wijngaarden'),

  // Funnel cluster. Required - drives the index page grouping and the
  // "next article" suggestions in cross-references. Values are internal
  // identifiers, not display strings (each locale maps them to its own labels).
  cluster: z
    .enum(['waarom', 'hoe', 'keuze'])
    .describe(
      'waarom = Why it matters, hoe = How it works, keuze = Which option fits',
    ),

  schema_type: z.enum(['Article', 'FAQPage']).default('Article'),

  related: z.array(z.string()).default([]),

  faq: z
    .array(
      z.object({
        q: z.string(),
        a: z.string(),
      }),
    )
    .default([]),

  linked_landing_faq: z.string().optional(),

  hero_image: z.string().url().optional(),

  nl_slug: z.string().optional(),
  en_slug: z.string().optional(),
});

const articles_nl = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/articles/nl' }),
  schema: articleSchema,
});

const articles_en = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/articles/en' }),
  schema: articleSchema,
});

const situatieSchema = z.object({
  title: z.string(),
  slug: z.string().optional(),
  meta_description: z.string().max(160),
  keywords: z.array(z.string()).default([]),
  publish_date: z.coerce.date(),
  status: z.enum(['draft', 'published']).default('draft'),
  author: z.string().default('André van Wijngaarden'),
  schema_type: z.enum(['Article', 'FAQPage']).default('Article'),
  related: z.array(z.string()).default([]),
  result: z.string().optional(),
});

const situaties = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/situaties' }),
  schema: situatieSchema,
});

export const collections = { articles_nl, articles_en, situaties };

# NL Articles — canonical authoring location

**This folder is the source of truth for Dutch articles served at `vaetestament.nl/artikelen/`.**

Astro picks them up via the `articles` content collection (see `src/content.config.ts`) and renders each `.md` to `/artikelen/{slug}/`.

## Editing

- Edit the `.md` files here. `npm run build` validates the frontmatter against the schema and fails loudly if anything is malformed.
- A historical pre-Astro copy of these articles also exists at `C:/vaetestament/content/articles/nl/` (the platform repo). That folder is **NOT** authoritative anymore — only this folder is. The platform copy stays for reference but should not be edited.

## Frontmatter contract (enforced)

See the Zod schema in `src/content.config.ts`. Key fields:

- `title`, `slug`, `meta_description` (≤160 chars), `keywords[]`
- `publish_date`, optional `updated_date`, `status` (`draft` or `published`)
- `author` (defaults to "André van Wijngaarden")
- `cluster` — `waarom` / `hoe` / `keuze` (drives index-page grouping + funnel cross-references)
- `schema_type` — `Article` (default) or `FAQPage`
- `related[]` — array of slugs; validated against the collection at build time
- `faq[]` — array of `{q, a}`; rendered at the article foot AND emitted as `FAQPage` JSON-LD
- `linked_landing_faq` — optional FAQ ID on the landing page for bidirectional cross-reference

## Body conventions

- **Do NOT include an H1 at the top of the body.** The template renders the frontmatter `title` as the H1. The first body line should be the lede paragraph or a `## H2` section heading.
- Inline links to other articles use `/artikelen/{slug}` (Astro generates these at build).

// Builds a JS module that exports the 8 articles as a static corpus for the
// Worker's /v1/article-ask endpoint. Run from the marketing repo; copy the
// output into `vaetestament-worker/src/data/article-corpus.js`.
//
// Run:  node scripts/build-article-corpus.mjs
// Output: scripts/article-corpus.generated.js
//
// We intentionally ship the FULL article body (not a summary) - Sonnet 4.6
// reads ~32k tokens for 8 articles, well within budget, and answer quality
// is dramatically higher with the full text. The first ~150 words of each
// article get a separate `lede` field so the AI can favour them when
// generating short answers.

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARTICLES_DIR = join(__dirname, '..', 'src', 'content', 'articles', 'nl');
const OUT_PATH = join(__dirname, 'article-corpus.generated.js');

function splitFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) throw new Error('No frontmatter');
  return { fmRaw: m[1], body: m[2].trim() };
}

// Minimal YAML parser - same as the D2 migration script.
function parseFm(fm) {
  const out = {};
  const lines = fm.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/);
    if (m) {
      const key = m[1];
      let v = m[2];
      if (v === '' || v === undefined) {
        // Inline block - collect indented children
        const arr = [];
        const objArr = [];
        let j = i + 1;
        while (j < lines.length && /^\s+/.test(lines[j])) {
          if (/^\s+-\s+q:\s*/.test(lines[j])) {
            const q = lines[j].replace(/^\s+-\s+q:\s*/, '').trim().replace(/^["']|["']$/g, '');
            j++;
            const aMatch = j < lines.length ? lines[j].match(/^\s+a:\s*(.*)$/) : null;
            const a = aMatch ? aMatch[1].trim().replace(/^["']|["']$/g, '') : '';
            objArr.push({ q, a });
            j++;
          } else if (/^\s+-\s+/.test(lines[j])) {
            arr.push(lines[j].replace(/^\s+-\s+/, '').trim().replace(/^["']|["']$/g, ''));
            j++;
          } else {
            break;
          }
        }
        if (objArr.length) out[key] = objArr;
        else if (arr.length) out[key] = arr;
        else out[key] = '';
        i = j;
        continue;
      }
      v = v.trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      out[key] = v;
    }
    i++;
  }
  return out;
}

function lede(body) {
  // First non-empty paragraph (capped at 280 chars). Strip Markdown formatting
  // for cleanliness so the AI doesn't latch onto stray `**` etc.
  const para = body.split(/\n{2,}/).find((p) => p.trim().length > 0) || '';
  return para
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 280);
}

const files = (await readdir(ARTICLES_DIR)).filter((f) => f.endsWith('.md'));

const articles = [];
for (const f of files.sort()) {
  const raw = await readFile(join(ARTICLES_DIR, f), 'utf8');
  const { fmRaw, body } = splitFrontmatter(raw);
  const fm = parseFm(fmRaw);
  articles.push({
    slug: fm.slug,
    title: fm.title,
    meta_description: fm.meta_description,
    cluster: fm.cluster,
    keywords: fm.keywords || [],
    publish_date: fm.publish_date,
    lede: lede(body),
    faq: fm.faq || [],
    body,
  });
}

const banner = `// AUTO-GENERATED. Do not edit by hand.
// Source: vaetestament/marketing/src/content/articles/nl/*.md
// Regenerate via \`node scripts/build-article-corpus.mjs\` in the marketing repo,
// then copy this file into vaetestament-worker/src/data/article-corpus.js.
//
// Schema per entry:
//   { slug, title, meta_description, cluster, keywords[], publish_date,
//     lede, faq: [{q,a}], body }
//
// The body is full Markdown of the article (frontmatter stripped). Used by
// the Worker's /v1/article-ask handler to ground AI answers in the corpus.
`;

const out = banner + '\nexport const ARTICLE_CORPUS = ' + JSON.stringify(articles, null, 2) + ';\n';

await writeFile(OUT_PATH, out, 'utf8');

const totalChars = articles.reduce((s, a) => s + a.body.length, 0);
console.log(`Wrote ${articles.length} articles to ${OUT_PATH}`);
console.log(`Total body chars: ${totalChars.toLocaleString()} (~${Math.round(totalChars / 4).toLocaleString()} tokens)`);

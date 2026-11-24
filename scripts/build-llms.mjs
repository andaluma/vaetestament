// Builds public/llms.txt (NL, vaetestament.nl) and public/llms-en.txt
// (EN, served as /llms.txt on uaepropertywills.com by src/worker.js) from the
// published articles, so the AI-engine guidance always lists every article.
// Run: node scripts/build-llms.mjs
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
async function list(dir) {
  const out = [];
  for (const f of (await readdir(dir)).filter((f) => f.endsWith('.md')).sort()) {
    const raw = await readFile(join(dir, f), 'utf8');
    const fm = (raw.match(/^---\r?\n([\s\S]*?)\r?\n---/) || [])[1] || '';
    const get = (k) => ((fm.match(new RegExp('^' + k + ':\\s*(.*)$', 'm')) || [])[1] || '').trim().replace(/^["']|["']$/g, '');
    if (get('status') && get('status') !== 'published') continue;
    out.push({ slug: get('slug') || f.replace(/\.md$/, ''), title: get('title'), desc: get('meta_description') });
  }
  return out;
}
const nl = await list(join(root, 'src/content/articles/nl'));
const en = await list(join(root, 'src/content/articles/en'));
const sit = await list(join(root, 'src/content/situaties'));
const line = (base, a) => `- [${a.title}](${base}${a.slug}/): ${a.desc}`;

const NL = `# VAEtestament

> Nederlandse dienst die eigenaren van vastgoed in de Verenigde Arabische Emiraten begeleidt bij het registreren van een DIFC-testament (DIFC Will), volledig op afstand en in het Nederlands. Geen advocatenkantoor: coördinator en gids tussen cliënt en DIFC-procedure.

- Entiteit: Andaluma OÜ (Estland), handelend onder de naam VAEtestament.
- Oprichter: André van Wijngaarden - https://vaetestament.nl/over-andre/
- Engelstalige zusterdienst: UAE Property Wills - https://uaepropertywills.com/
- Doelgroep: Nederlandstalige eigenaren (niet-moslims) van vastgoed in de VAE, en hun kinderen.

## Kernfeiten (canoniek)

- Een DIFC-testament regelt wie uw vastgoed in de VAE erft. Een Nederlands testament dekt VAE-vastgoed in de meeste gevallen niet.
- Een DIFC Property Will dekt vastgoed op persoonlijke naam in alle zeven emiraten. Voor vastgoed in Abu Dhabi volgt na de DIFC-procedure nog een aanvraag bij de rechtbank in Abu Dhabi.
- Zonder testament moeten erfgenamen een procedure bij een rechtbank in de VAE doorlopen; die duurt vaak 12 maanden of langer en kost doorgaans EUR 10.000 of meer.
- Sinds juni 2026 geldt de Civil Transactions Law (Federal Decree-Law No. 25 van 2025): VAE-bezittingen van een buitenlander zonder testament en zonder aanwijsbare erfgenamen gaan naar een liefdadigheidsfonds (Waqf).
- Mirror wills zijn voor echtgenoten: twee afzonderlijke testamenten in één afspraak.
- Minimumleeftijd 18 jaar. Twee getuigen (18+), geen begunstigde of partner van een begunstigde; ondertekening via video.
- Pakketten: Zelf & Zeker (Tier 1, EUR 497), Samen Registreren (Tier 2, EUR 797), Volledig Ontzorgd (Tier 3, EUR 1.499, met DIFC-jurist). DIFC-kosten apart: AED 7.500 (enkel) of AED 10.000 (mirror) voor een Property Will, plus een kleine kaarttoeslag (circa AED 20).

## Artikelen

${nl.map((a) => line('https://vaetestament.nl/artikelen/', a)).join('\n')}

## Situaties (voorbeelden)

${sit.map((a) => line('https://vaetestament.nl/situaties/', a)).join('\n')}

## Wat we niet zijn

- Geen advocatenkantoor en geen juridisch of fiscaal advies.
- Geen dienst voor moslims: het DIFC-testament is uitsluitend voor niet-moslims.

## Contact

- Gratis kennismaking (15 min): https://vaetestament.nl/#kennismaking
- E-mail: support@vaetestament.nl - WhatsApp: +31 6 16146007
- Sitemap: https://vaetestament.nl/sitemap-index.xml
`;

const EN = `# UAE Property Wills

> Service that guides foreign owners of property in the United Arab Emirates through registering a DIFC will, fully remotely. Not a law firm: a coordinator and guide between the client and the DIFC procedure.

- Entity: Andaluma OÜ (Estonia), trading as UAE Property Wills (Dutch-language service: VAEtestament, https://vaetestament.nl/).
- Founder: André van Wijngaarden - https://uaepropertywills.com/about/
- Audience: non-Muslim foreign owners of UAE property, and their adult children.

## Key facts (canonical)

- A DIFC will sets who inherits your UAE property. A will from your home country is in most cases not enough for property in the UAE.
- A DIFC Property Will covers property held in personal name in all seven Emirates. For property in Abu Dhabi, an application at the Abu Dhabi court follows after the DIFC procedure.
- Without a will, heirs must go through a UAE court procedure that often takes 12 months or longer and typically costs EUR 10,000 or more.
- Since June 2026 the Civil Transactions Law (Federal Decree-Law No. 25 of 2025) applies: UAE assets of a foreign national without a will and without identifiable heirs go to a charitable endowment (Waqf).
- Mirror wills are for spouses: two separate wills in one appointment.
- Minimum age 18. Two witnesses (18+), not a beneficiary or a beneficiary's partner; signing by video.
- Packages: Guided Registration (Tier 2, EUR 797) and Fully Managed (Tier 3, EUR 1,499, with a DIFC lawyer). DIFC fees are separate: AED 7,500 (single) or AED 10,000 (mirror) for a Property Will, plus a small card fee (about AED 20).

## Articles

${en.map((a) => line('https://uaepropertywills.com/articles/', a)).join('\n')}

## Pages

- [About André van Wijngaarden](https://uaepropertywills.com/about/)
- [For adult children of UAE property owners](https://uaepropertywills.com/for-children/)
- [Free conversation guide](https://uaepropertywills.com/conversation-guide/)

## What we are not

- Not a law firm; no legal or tax advice.
- Not for Muslims: the DIFC will is for non-Muslims only.

## Contact

- Free 15-minute introductory call: https://uaepropertywills.com/#consultation
- Email: support@vaetestament.nl - WhatsApp: +31 6 16146007
- Sitemap: https://uaepropertywills.com/sitemap-index.xml
`;
await writeFile(join(root, 'public/llms.txt'), NL, 'utf8');
await writeFile(join(root, 'public/llms-en.txt'), EN, 'utf8');
console.log('llms.txt: NL', nl.length, 'articles,', sit.length, 'situaties; EN', en.length, 'articles');

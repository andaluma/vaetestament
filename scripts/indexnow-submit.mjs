// IndexNow submission helper.
//
// Submits all live URLs from the sitemap to api.indexnow.org so Bing,
// Yandex, Naver, and any other IndexNow-aware engines re-crawl quickly
// after a content update. (Google ignores IndexNow but indexes from the
// sitemap; Bing in particular benefits noticeably.)
//
// Both domains (nl + en) are served by the same Worker from the same
// dist/, so the single key file at public/<KEY>.txt resolves on BOTH
// hosts. IndexNow is per-host though: it rejects a whole batch (422) if
// any URL is off the host being submitted. So we group URLs by host and
// POST one batch per host, with keyLocation pointing at that same host.
//
// Run after a content change has been deployed:
//   node scripts/indexnow-submit.mjs
//
// Or selectively (still grouped by host automatically):
//   node scripts/indexnow-submit.mjs https://vaetestament.nl/artikelen/wat-is-een-difc-will/

const KEY = '70dea2634ec6484db56db04d12e64247';
const HOSTS = ['vaetestament.nl', 'uaepropertywills.com'];
// Each domain serves its own filtered sitemap (see src/worker.js).
async function fetchSitemapUrls() {
  const all = [];
  for (const host of HOSTS) {
    const res = await fetch(`https://${host}/sitemap-0.xml`);
    if (!res.ok) throw new Error(`sitemap fetch failed for ${host}: ${res.status}`);
    const xml = await res.text();
    all.push(...[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
  }
  return all;
}

async function submitHost(host, urls) {
  if (!urls.length) {
    console.log(`\n${host}: no URLs, skipping.`);
    return;
  }
  console.log(`\n${host}: submitting ${urls.length} URLs...`);
  const res = await fetch('https://api.indexnow.org/IndexNow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host,
      key: KEY,
      keyLocation: `https://${host}/${KEY}.txt`,
      urlList: urls,
    }),
  });
  console.log(`${host}: IndexNow response ${res.status} ${res.statusText}`);
  if (!res.ok) console.log((await res.text().catch(() => '')).slice(0, 500));
  // 200/202 = success. 422 = invalid URLs in batch. 403 = key mismatch.
}

const explicit = process.argv.slice(2).filter((a) => a.startsWith('http'));
const allUrls = explicit.length ? explicit : await fetchSitemapUrls();

for (const host of HOSTS) {
  await submitHost(host, allUrls.filter((u) => new URL(u).host === host));
}

// IndexNow submission helper.
//
// Submits all live URLs from the sitemap to api.indexnow.org so Bing,
// Yandex, Naver, and any other IndexNow-aware engines re-crawl quickly
// after a content update. (Google ignores IndexNow but indexes from the
// sitemap; Bing in particular benefits noticeably.)
//
// The key file at public/<KEY>.txt is the auth proof; the search engines
// fetch it before accepting the submission.
//
// Run after a content change has been deployed:
//   node scripts/indexnow-submit.mjs
//
// Or selectively:
//   node scripts/indexnow-submit.mjs https://vaetestament.nl/artikelen/wat-is-een-difc-will/

const KEY = '70dea2634ec6484db56db04d12e64247';
const HOST = 'vaetestament.nl';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

async function fetchSitemapUrls() {
  const res = await fetch(`https://${HOST}/sitemap-0.xml`);
  if (!res.ok) throw new Error(`sitemap fetch failed: ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

const explicit = process.argv.slice(2).filter((a) => a.startsWith('http'));
// The sitemap is cross-domain (nl + en). IndexNow rejects the whole batch
// (422) if any URL is off the verified host, so keep only this host's URLs.
const urlList = (explicit.length ? explicit : await fetchSitemapUrls())
  .filter((u) => new URL(u).host === HOST);

console.log(`Submitting ${urlList.length} URLs to IndexNow:`);
urlList.forEach((u) => console.log('  ' + u));

const res = await fetch('https://api.indexnow.org/IndexNow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList,
  }),
});

console.log(`\nIndexNow response: ${res.status} ${res.statusText}`);
if (!res.ok) {
  const body = await res.text().catch(() => '');
  console.log(body.slice(0, 500));
}
// 200/202 = success. 422 = invalid URLs in batch. 403 = key mismatch.

/**
 * Marketing site Worker - serves both vaetestament.nl (NL) and
 * uaepropertywills.com (EN) from the same Astro build.
 *
 * Responsibilities:
 * - www -> non-www redirect (both domains)
 * - /r/<code> referral short-links with Firebase RTDB logging
 * - Domain-based locale detection for future routing
 * - Static asset serving via env.ASSETS with custom 404
 */

const RTDB_HOST = 'https://vaetestament-default-rtdb.europe-west1.firebasedatabase.app';

const LOCALE_DOMAINS = {
  nl: 'https://vaetestament.nl',
  en: 'https://uaepropertywills.com',
  es: 'https://vaetestament.nl',  // placeholder until ES domain launches
};

const DOMAIN_TO_LOCALE = {
  'vaetestament.nl': 'nl',
  'www.vaetestament.nl': 'nl',
  'uaepropertywills.com': 'en',
  'www.uaepropertywills.com': 'en',
};

const WWW_HOSTS = new Set([
  'www.vaetestament.nl',
  'www.uaepropertywills.com',
]);

const BOT_RE = /bot|crawl|spider|preview|fetch|slurp|facebookexternalhit|whatsapp|telegrambot|twitterbot|linkedinbot|discordbot|googlebot|bingbot|yandex|semrush|ahrefs|mj12bot|bytespider|gptbot|chatgpt|claude|dataprovider|embedly|quora|outbrain|pinterest|slack|vkshare|redditbot|applebot|duckduckbot|ia_archiver|seznambot|sogou|exabot|mediapartners|adsbot|apis-google|feedfetcher|google-read-aloud|duplex|favicon|headlesschrome|lighthouse|pagespeed|gtmetrix|uptimerobot|pingdom|safebrowsing/i;

function isBot(ua) {
  return !ua || BOT_RE.test(ua);
}

async function hashIp(ip, salt) {
  const data = new TextEncoder().encode(ip + salt);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function rtdbGet(path, secret) {
  const url = `${RTDB_HOST}/${path}.json?auth=${encodeURIComponent(secret)}`;
  const resp = await fetch(url);
  if (!resp.ok) return null;
  return resp.json();
}

async function rtdbPost(path, data, secret) {
  const url = `${RTDB_HOST}/${path}.json?auth=${encodeURIComponent(secret)}`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

const FALLBACK_404 = {
  nl: '<h1>404 - Pagina niet gevonden</h1><p><a href="/">Terug naar de homepage</a></p>',
  en: '<h1>404 - Page not found</h1><p><a href="/articles/">Back to the articles hub</a></p>',
};

async function serve404(env, url, locale = 'nl') {
  try {
    const resp = await env.ASSETS.fetch(
      new Request(url.origin + '/404.html', { method: 'GET' })
    );
    return new Response(resp.body, {
      status: 404,
      headers: { 'Content-Type': 'text/html;charset=UTF-8' },
    });
  } catch {
    return new Response(FALLBACK_404[locale] || FALLBACK_404.nl, {
      status: 404,
      headers: { 'Content-Type': 'text/html;charset=UTF-8' },
    });
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const host = url.hostname;
    const locale = DOMAIN_TO_LOCALE[host] || 'nl';

    // www -> non-www 301 redirect (both domains)
    if (WWW_HOSTS.has(host)) {
      const canonical = LOCALE_DOMAINS[locale] || LOCALE_DOMAINS.nl;
      return Response.redirect(canonical + url.pathname + url.search, 301);
    }

    // Serve domain-specific robots.txt so each domain references its own sitemap
    if (url.pathname === '/robots.txt') {
      const domain = LOCALE_DOMAINS[locale] || LOCALE_DOMAINS.nl;
      const body = [
        'User-agent: *',
        'Allow: /',
        '',
        'Sitemap: ' + domain + '/sitemap-index.xml',
        '',
        'Disallow: /baraca-1pager.html',
        'Disallow: /BARACA_OVEREENKOMST.html',
        'Disallow: /BARACA_VOORSTEL.html',
        'Disallow: /bedankt',
      ].join('\n');
      return new Response(body, {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' },
      });
    }

    // EN domain: serve the EN homepage (built at /en/) when visiting /
    if (locale === 'en' && (url.pathname === '/' || url.pathname === '')) {
      return env.ASSETS.fetch(
        new Request(url.origin + '/en/', { method: 'GET' })
      );
    }

    // Only intercept /r/<code> paths
    const match = url.pathname.match(/^\/r\/([a-z0-9-]+)\/?$/i);
    if (!match) {
      try {
        const assetResp = await env.ASSETS.fetch(request);
        if (assetResp.status >= 400) {
          return await serve404(env, url, locale);
        }
        return assetResp;
      } catch {
        return await serve404(env, url, locale);
      }
    }

    const code = match[1].toLowerCase();
    const fallbackUrl = LOCALE_DOMAINS.nl + '/';

    if (!env.FIREBASE_DATABASE_SECRET) {
      console.log('[ref] no FIREBASE_DATABASE_SECRET');
      return Response.redirect(fallbackUrl, 302);
    }

    const secret = env.FIREBASE_DATABASE_SECRET.trim();

    // Look up partner (non-blocking on failure - always redirect)
    let partner;
    try {
      partner = await rtdbGet(`partners/${code}`, secret);
    } catch {
      return Response.redirect(fallbackUrl, 302);
    }

    if (!partner || partner.active === false) {
      return Response.redirect(fallbackUrl, 302);
    }

    const partnerLocale = partner.default_locale || 'nl';
    const targetDomain = LOCALE_DOMAINS[partnerLocale] || LOCALE_DOMAINS.nl;
    const redirectUrl = `${targetDomain}/?ref=${encodeURIComponent(code)}`;

    // Log click asynchronously - don't block the redirect
    const ua = request.headers.get('User-Agent') || '';
    if (!isBot(ua)) {
    ctx.waitUntil((async () => {
      try {
        const ip = request.headers.get('CF-Connecting-IP') || '';
        const hashedIp = await hashIp(ip, env.CLICK_HASH_SALT || '');
        await rtdbPost('partner_clicks', {
          ref_code: code,
          timestamp: { '.sv': 'timestamp' },
          hashed_ip: hashedIp,
          user_agent: request.headers.get('User-Agent') || '',
          referrer_url: request.headers.get('Referer') || '',
          locale: partnerLocale,
        }, secret);
      } catch (err) {
        console.error('[referral-click] log failed:', err);
      }
    })());
    }

    return Response.redirect(redirectUrl, 302);
  },
};

const MEDIAWIKI_SOURCES = [
  {
    id: 'wikipedia',
    title: 'Wikipedia',
    apiByLocale: {
      zh: 'https://zh.wikipedia.org/w/api.php',
      ja: 'https://ja.wikipedia.org/w/api.php',
      en: 'https://en.wikipedia.org/w/api.php',
    },
    pageBaseByLocale: {
      zh: 'https://zh.wikipedia.org/wiki/',
      ja: 'https://ja.wikipedia.org/wiki/',
      en: 'https://en.wikipedia.org/wiki/',
    },
    trustTier: 'medium',
  },
  {
    id: 'moegirl',
    title: 'Moegirlpedia',
    apiByLocale: {
      zh: 'https://zh.moegirl.org.cn/api.php',
      ja: 'https://ja.moegirl.org.cn/api.php',
      en: 'https://en.moegirl.org.cn/api.php',
    },
    pageBaseByLocale: {
      zh: 'https://zh.moegirl.org.cn/',
      ja: 'https://ja.moegirl.org.cn/',
      en: 'https://en.moegirl.org.cn/',
    },
    trustTier: 'medium',
  },
];

const OFFICIAL_SOURCES = [
  {
    title: 'KAMITSUBAKI STUDIO Official',
    url: 'https://kamitsubaki.jp/',
    sourceType: 'official',
    trustTier: 'high',
  },
  {
    title: 'KAMITSUBAKI STUDIO News',
    url: 'https://kamitsubaki.jp/news/',
    sourceType: 'official',
    trustTier: 'high',
  },
  {
    title: 'KAF Official Site',
    url: 'https://kaf.kamitsubaki.jp/',
    sourceType: 'official',
    trustTier: 'high',
  },
  {
    title: 'KAMITSUBAKI CITY UNDER CONSTRUCTION',
    url: 'https://kamitsubaki-city-under-construction.com/',
    sourceType: 'official',
    trustTier: 'high',
  },
];

const ALLOWED_HOSTS = new Set([
  'kamitsubaki.jp',
  'kamitsubaki-city-under-construction.com',
  'wikipedia.org',
  'moegirl.org.cn',
]);

const DEFAULT_TIMEOUT_MS = 2500;

function normalizeLocale(locale) {
  return ['zh', 'ja', 'en'].includes(locale) ? locale : 'zh';
}

export function isAllowedSourceUrl(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return Array.from(ALLOWED_HOSTS).some((host) => hostname === host || hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

export function buildKamitsubakiSearchQuery(message) {
  const normalized = String(message || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  if (!normalized) {
    return 'KAMITSUBAKI STUDIO 神椿';
  }

  if (/神椿|kamitsubaki/i.test(normalized)) {
    return normalized;
  }

  return `${normalized} KAMITSUBAKI STUDIO 神椿`;
}

function pageUrl(base, title) {
  return `${base}${encodeURIComponent(title.replace(/\s+/g, '_'))}`;
}

async function fetchJsonWithTimeout(fetchImpl, url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'kamitsubaki-wiki-ai-observer/0.1',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function searchMediaWikiSource(source, { query, locale, fetchImpl, limit }) {
  const selectedLocale = normalizeLocale(locale);
  const api = source.apiByLocale[selectedLocale] ?? source.apiByLocale.zh;
  const base = source.pageBaseByLocale[selectedLocale] ?? source.pageBaseByLocale.zh;
  const url = new URL(api);
  url.searchParams.set('action', 'query');
  url.searchParams.set('list', 'search');
  url.searchParams.set('srsearch', query);
  url.searchParams.set('srlimit', String(limit));
  url.searchParams.set('format', 'json');
  url.searchParams.set('utf8', '1');
  url.searchParams.set('origin', '*');

  const data = await fetchJsonWithTimeout(fetchImpl, url);
  const results = Array.isArray(data?.query?.search) ? data.query.search : [];

  return results
    .filter((entry) => typeof entry.title === 'string' && entry.title)
    .map((entry) => ({
      title: `${source.title}: ${entry.title}`,
      url: pageUrl(base, entry.title),
      snippet: typeof entry.snippet === 'string' ? entry.snippet.replace(/<[^>]*>/g, '') : '',
      sourceType: 'wiki',
      trustTier: source.trustTier,
    }))
    .filter((entry) => isAllowedSourceUrl(entry.url));
}

function officialSourceCandidates(query) {
  const lowerQuery = query.toLowerCase();
  return OFFICIAL_SOURCES.filter((source) => {
    if (/花譜|花谱|kaf\b/i.test(query)) {
      return source.url.includes('kaf.') || source.url.includes('kamitsubaki.jp');
    }

    if (/神椿市|city|建設中|construction/i.test(query)) {
      return source.url.includes('city') || source.url.includes('kamitsubaki.jp');
    }

    return lowerQuery.includes('kamitsubaki') || query.includes('神椿');
  });
}

export async function retrieveKamitsubakiSources({ message, locale = 'zh', fetchImpl = fetch, limit = 5 }) {
  const query = buildKamitsubakiSearchQuery(message);
  const perSourceLimit = Math.max(1, Math.min(3, limit));
  const wikiResults = await Promise.all(
    MEDIAWIKI_SOURCES.map((source) =>
      searchMediaWikiSource(source, {
        query,
        locale,
        fetchImpl,
        limit: perSourceLimit,
      }),
    ),
  );
  const wikiFlat = wikiResults.flat();
  const officialResults = officialSourceCandidates(query).filter((source) => isAllowedSourceUrl(source.url));
  const officialLimit = wikiFlat.length > 0 ? Math.min(2, Math.max(0, limit - Math.min(wikiFlat.length, limit))) : limit;
  const merged = [...officialResults.slice(0, officialLimit), ...wikiFlat];
  const seen = new Set();

  return merged
    .filter((source) => {
      if (seen.has(source.url)) {
        return false;
      }
      seen.add(source.url);
      return true;
    })
    .slice(0, limit);
}

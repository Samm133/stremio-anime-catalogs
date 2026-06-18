const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const KITSU = 'https://kitsu.io/api/edge';

// Kitsu API: max page[limit] is 20. We fetch multiple pages to get 50 results.
const ENDPOINT_MAP = {
  'kitsu-airing':  '/anime?filter%5Bstatus%5D=current&sort=-userCount',
  'kitsu-popular': '/anime?sort=-userCount',
  'kitsu-rated':   '/anime?sort=-averageRating',
  'kitsu-newest':  '/anime?sort=-createdAt',
};

async function fetchKitsuPage(endpoint, page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  const url = `${KITSU}${endpoint}&page%5Blimit%5D=${limit}&page%5Boffset%5D=${offset}`;
  const resp = await fetch(url, { headers: { 'Accept': 'application/vnd.api+json' } });
  if (!resp.ok) {
    console.error(`[Kitsu] HTTP ${resp.status} for ${url}`);
    return [];
  }
  const data = await resp.json();
  return data?.data || [];
}

async function fetchKitsu(catalogId) {
  const endpoint = ENDPOINT_MAP[catalogId];
  if (!endpoint) return [];

  try {
    // Fetch 3 pages of 20 = 60 results
    const [page1, page2, page3] = await Promise.all([
      fetchKitsuPage(endpoint, 1, 20),
      fetchKitsuPage(endpoint, 2, 20),
      fetchKitsuPage(endpoint, 3, 20),
    ]);

    const items = [...page1, ...page2, ...page3];

    return items.map(item => {
      const attr = item.attributes || {};
      return {
        id: `kitsu:${item.id}`,
        type: 'anime',
        name: attr.canonicalTitle || attr.titles?.en || 'Sin título',
        poster: attr.posterImage?.large || attr.posterImage?.original,
        background: attr.coverImage?.large || attr.coverImage?.original,
        description: attr.synopsis || '',
        genres: (attr.categories || []).map(c => c.title),
        releaseInfo: attr.startDate ? attr.startDate.substring(0, 4) : '',
        imdbRating: attr.averageRating ? (parseFloat(attr.averageRating) / 10).toFixed(1) : undefined,
      };
    });
  } catch (err) {
    console.error(`[Kitsu] Error fetching ${catalogId}:`, err.message);
    return [];
  }
}

module.exports = { fetchKitsu };

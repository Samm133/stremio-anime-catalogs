const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const KITSU = 'https://kitsu.io/api/edge';

const ENDPOINT_MAP = {
  'kitsu-airing':  '/anime?filter[status]=current&sort=-userCount&page[limit]=50',
  'kitsu-popular': '/anime?sort=-userCount&page[limit]=50',
  'kitsu-rated':   '/anime?sort=-averageRating&page[limit]=50',
  'kitsu-newest':  '/anime?sort=-createdAt&page[limit]=50',
};

async function fetchKitsu(catalogId) {
  const endpoint = ENDPOINT_MAP[catalogId];
  if (!endpoint) return [];

  const resp = await fetch(`${KITSU}${endpoint}`, {
    headers: { 'Accept': 'application/vnd.api+json' }
  });
  const data = await resp.json();
  const items = data?.data || [];

  return items.map(item => {
    const attr = item.attributes || {};
    return {
      id: `kitsu:${item.id}`,
      type: 'anime',
      name: attr.canonicalTitle || attr.titles?.en || 'Sin título',
      poster: attr.posterImage?.large || attr.posterImage?.original,
      background: attr.coverImage?.large || attr.coverImage?.original,
      description: attr.synopsis || '',
      releaseInfo: attr.startDate ? attr.startDate.substring(0, 4) : '',
      imdbRating: attr.averageRating ? (parseFloat(attr.averageRating) / 10).toFixed(1) : undefined,
    };
  });
}

module.exports = { fetchKitsu };

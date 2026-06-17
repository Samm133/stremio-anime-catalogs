const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

// Jikan es la API pública no oficial de MyAnimeList — no requiere API key
const JIKAN = 'https://api.jikan.moe/v4';

const ENDPOINT_MAP = {
  'mal-top-all':  '/top/anime?type=tv&limit=50',
  'mal-airing':   '/top/anime?filter=airing&limit=50',
  'mal-popular':  '/top/anime?filter=bypopularity&limit=50',
  'mal-movies':   '/top/anime?type=movie&limit=50',
};

async function fetchMyAnimeList(catalogId) {
  const endpoint = ENDPOINT_MAP[catalogId];
  if (!endpoint) return [];

  // Jikan tiene rate limit de ~3 req/seg, añadimos pequeño delay
  await new Promise(r => setTimeout(r, 400));

  const resp = await fetch(`${JIKAN}${endpoint}`);
  const data = await resp.json();
  const items = data?.data || [];

  return items.map(item => ({
    id: `mal:${item.mal_id}`,
    type: item.type === 'Movie' ? 'movie' : 'anime',
    name: item.title_english || item.title,
    poster: item.images?.jpg?.large_image_url,
    description: item.synopsis || '',
    genres: (item.genres || []).map(g => g.name),
    releaseInfo: item.year?.toString() || '',
    imdbRating: item.score ? item.score.toFixed(1) : undefined,
  }));
}

module.exports = { fetchMyAnimeList };

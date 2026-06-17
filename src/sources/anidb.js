const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

// AniDB no tiene API pública abierta para catálogos.
// Usamos AniList con filtros específicos para simular los catálogos de AniDB
// (Popular, por décadas) que es lo que el addon original también hace internamente.

const ANILIST_API = 'https://graphql.anilist.co';

const DECADE_MAP = {
  'anidb-popular': { sort: 'POPULARITY_DESC', yearStart: null, yearEnd: null },
};

const QUERY = `
query ($sort: [MediaSort], $yearStart: Int, $yearEnd: Int, $page: Int) {
  Page(page: $page, perPage: 50) {
    media(
      type: ANIME,
      sort: $sort,
      startDate_greater: $yearStart,
      startDate_lesser: $yearEnd,
      isAdult: false
    ) {
      id
      title { romaji english }
      description(asHtml: false)
      coverImage { large }
      bannerImage
      averageScore
      genres
      startDate { year }
    }
  }
}`;

async function fetchAniDB(catalogId) {
  const config = DECADE_MAP[catalogId];
  if (!config) return [];

  const variables = {
    sort: [config.sort],
    page: 1,
    yearStart: config.yearStart ? config.yearStart * 10000 : undefined,
    yearEnd: config.yearEnd ? config.yearEnd * 10000 : undefined,
  };

  const resp = await fetch(ANILIST_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: QUERY, variables })
  });

  const data = await resp.json();
  const items = data?.data?.Page?.media || [];

  return items.map(item => ({
    id: `anilist:${item.id}`,
    type: 'anime',
    name: item.title.english || item.title.romaji,
    poster: item.coverImage?.large,
    background: item.bannerImage,
    description: item.description?.replace(/<[^>]*>/g, '') || '',
    genres: item.genres || [],
    releaseInfo: item.startDate?.year?.toString() || '',
    imdbRating: item.averageScore ? (item.averageScore / 10).toFixed(1) : undefined,
  }));
}

module.exports = { fetchAniDB };

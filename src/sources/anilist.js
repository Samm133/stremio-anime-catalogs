const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const ANILIST_API = 'https://graphql.anilist.co';

const SORT_MAP = {
  'anilist-trending':  'TRENDING_DESC',
  'anilist-popular':   'POPULARITY_DESC',
  'anilist-all-time':  'POPULARITY_DESC',
  'anilist-top':       'SCORE_DESC',
};

const QUERY = `
query ($sort: [MediaSort], $page: Int) {
  Page(page: $page, perPage: 50) {
    media(type: ANIME, sort: $sort, isAdult: false) {
      id
      title { romaji english }
      description(asHtml: false)
      coverImage { large }
      bannerImage
      averageScore
      genres
      status
      episodes
      startDate { year }
    }
  }
}`;

async function fetchAniList(catalogId) {
  const sort = SORT_MAP[catalogId] || 'POPULARITY_DESC';

  const resp = await fetch(ANILIST_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: QUERY, variables: { sort: [sort], page: 1 } })
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

module.exports = { fetchAniList };

const { getImdbId } = require('./mapping');

// Apply poster with rating visible on it.
// Strategy:
//  1. If user provides an RPDB key → use RPDB (best quality, rating badge on poster)
//  2. Else if IMDB ID is available → use images.metahub.space (Stremio's own CDN,
//     shows the official IMDB poster with rating badge, free & no key needed)
//  3. Otherwise → keep original poster from the source API
function applyRatingPoster(meta, type, originalId, rpdbKey) {
  const newMeta = { ...meta };
  
  const imdbId = getImdbId(type, originalId);
  
  if (!imdbId) return newMeta; // no IMDB mapping found, keep original poster
  
  if (rpdbKey) {
    // RPDB paid/free key: custom poster with styled rating badge
    newMeta.poster = `https://api.ratingposterdb.com/${rpdbKey}/imdb/poster-default/${imdbId}.jpg?fallback=true`;
  } else {
    // Stremio MetaHub: official IMDB poster that Stremio uses internally.
    // Stremio will show the imdbRating field as a badge overlay on top of this poster.
    newMeta.poster = `https://images.metahub.space/poster/small/${imdbId}/img`;
    // Also set background and logo from MetaHub if not already present
    if (!newMeta.background) {
      newMeta.background = `https://images.metahub.space/background/medium/${imdbId}/img`;
    }
    if (!newMeta.logo) {
      newMeta.logo = `https://images.metahub.space/logo/medium/${imdbId}/img`;
    }
  }
  
  return newMeta;
}

module.exports = { applyRatingPoster };

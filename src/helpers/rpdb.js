const { getImdbId } = require('./mapping');

function applyRPDB(meta, type, originalId, rpdbKey) {
  const newMeta = { ...meta };
  
  if (!rpdbKey) return newMeta; 
  
  const imdbId = getImdbId(type, originalId);
  
  if (imdbId) {
    newMeta.poster = `https://api.ratingposterdb.com/${rpdbKey}/imdb/poster-default/${imdbId}.jpg?fallback=true`;
  }
  
  return newMeta;
}

module.exports = { applyRPDB };

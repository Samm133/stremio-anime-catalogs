const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

let malDubs = [];
let toImdb = {};
let fribbMapping = [];

async function populateMappings() {
  try {
    // 1. Fetch Dubbed MAL IDs
    const dubResp = await fetch('https://raw.githubusercontent.com/MAL-Dubs/MAL-Dubs/main/data/dubInfo.json');
    if (dubResp.ok) {
      const data = await dubResp.json();
      malDubs = data.dubbed || [];
      console.log(`[Mapping] Loaded ${malDubs.length} dubbed MAL IDs`);
    }

    // 2. Fetch Kitsu -> IMDB mapping
    const imdbResp = await fetch('https://raw.githubusercontent.com/TheBeastLT/stremio-kitsu-anime/master/static/data/imdb_mapping.json');
    if (imdbResp.ok) {
      toImdb = await imdbResp.json();
      console.log(`[Mapping] Loaded ${Object.keys(toImdb).length} Kitsu->IMDB mappings`);
    }

    // 3. Fetch Fribb Anime List (cross-platform IDs)
    const fribbResp = await fetch('https://raw.githubusercontent.com/Fribb/anime-lists/master/anime-list-full.json');
    if (fribbResp.ok) {
      fribbMapping = await fribbResp.json();
      console.log(`[Mapping] Loaded ${fribbMapping.length} Fribb anime mappings`);
    }
  } catch (err) {
    console.error('[Mapping] Error populating mappings:', err.message);
  }
}

// Initial populate
populateMappings();
setInterval(populateMappings, 12 * 60 * 60 * 1000); // refresh every 12 hours

// Find cross-reference data for a given ID and Type (anilist, mal, kitsu)
function getMappingData(type, id) {
  const numericId = parseInt(id.toString().replace(/\D/g, ''), 10);
  if (!numericId) return null;

  return fribbMapping.find(item => {
    if (type === 'anilist') return item.anilist_id === numericId;
    if (type === 'mal') return item.mal_id === numericId;
    if (type === 'kitsu') return item.kitsu_id === numericId;
    return false;
  }) || null;
}

// Check if a show is dubbed
function isDubbed(type, id) {
  if (type === 'mal') return malDubs.includes(parseInt(id, 10));
  
  const mapData = getMappingData(type, id);
  if (mapData && mapData.mal_id) {
    return malDubs.includes(mapData.mal_id);
  }
  return false;
}

// Get IMDB ID for RPDB
function getImdbId(type, id) {
  let kitsuId = type === 'kitsu' ? parseInt(id, 10) : null;
  
  if (!kitsuId) {
    const mapData = getMappingData(type, id);
    if (mapData && mapData.kitsu_id) kitsuId = mapData.kitsu_id;
  }

  if (kitsuId && toImdb[kitsuId]) {
    return toImdb[kitsuId].imdb_id || null;
  }
  
  // Fribb mapping might contain IMDB if not found in TheBeastLT list? No, Fribb usually doesn't have IMDB.
  return null;
}

module.exports = {
  isDubbed,
  getImdbId,
  getMappingData
};

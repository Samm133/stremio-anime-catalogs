const express = require('express');
const cors = require('cors');
const qs = require('querystring');
const { fetchAniList } = require('./sources/anilist');
const { fetchMyAnimeList } = require('./sources/mal');
const { fetchKitsu } = require('./sources/kitsu');
const { fetchAniDB } = require('./sources/anidb');
const { applyRPDB } = require('./helpers/rpdb');
const { isDubbed } = require('./helpers/mapping');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 7000;

const baseCatalogs = [
  { type: 'anime', id: 'anilist-trending',      name: 'AniList - Trending Now' },
  { type: 'anime', id: 'anilist-popular',       name: 'AniList - Popular This Season' },
  { type: 'anime', id: 'anilist-all-time',      name: 'AniList - All Time Popular' },
  { type: 'anime', id: 'anilist-top',           name: 'AniList - Top Anime' },
  { type: 'anime', id: 'mal-top-all',           name: 'MyAnimeList - Top All Time' },
  { type: 'anime', id: 'mal-airing',            name: 'MyAnimeList - Top Airing' },
  { type: 'anime', id: 'mal-popular',           name: 'MyAnimeList - Popular' },
  { type: 'anime', id: 'mal-movies',            name: 'MyAnimeList - Top Movies' },
  { type: 'anime', id: 'kitsu-airing',          name: 'Kitsu - Top Airing' },
  { type: 'anime', id: 'kitsu-popular',         name: 'Kitsu - Most Popular' },
  { type: 'anime', id: 'kitsu-rated',           name: 'Kitsu - Highest Rated' },
  { type: 'anime', id: 'kitsu-newest',          name: 'Kitsu - Newest' },
  { type: 'anime', id: 'anidb-popular',         name: 'AniDB - Popular' }
];

const MANIFEST = {
  id: 'community.anime-catalogs-clone',
  version: '1.0.0',
  name: 'Anime Catalogs',
  description: 'Catálogos de anime desde AniList, MyAnimeList, Kitsu y AniDB. Soporta RPDB y Dubbed.',
  logo: 'https://dl.strem.io/addon-logo.png',
  resources: ['catalog'],
  types: ['anime', 'series', 'movie'],
  idPrefixes: ['kitsu:', 'mal:', 'anilist:'],
  behaviorHints: { configurable: true, configurationRequired: true }
};

function parseConfig(configStr) {
  let cfg = { rpdbkey: '', dubbed: false };
  if (!configStr) return cfg;
  try {
    const parsed = JSON.parse(configStr);
    return { ...cfg, ...parsed };
  } catch(e) {
    return cfg;
  }
}

function getManifest(config) {
  const manifestClone = JSON.parse(JSON.stringify(MANIFEST));
  
  manifestClone.catalogs = baseCatalogs.map(c => {
    return {
      ...c,
      name: config.dubbed ? `Dubbed ${c.name}` : c.name,
      extra: [{ name: 'genre', options: ['Top Rated', 'Dubbed'] }, { name: 'skip' }]
    };
  });
  
  if (config.dubbed) {
    manifestClone.name = `Dubbed ${manifestClone.name}`;
  }
  
  return manifestClone;
}

app.get('/', (req, res) => res.redirect('/configure'));

app.get('/configure', (req, res) => {
  const host = process.env.ADDON_URL || ('http://localhost:' + PORT);
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Anime Catalogs - Configurar</title>
      <style>
        body { font-family: sans-serif; background: #1a1a2e; color: #eee; max-width: 500px; margin: 40px auto; padding: 20px; }
        h1 { color: #e94560; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; color: #aaa; }
        input[type="text"] { width: 100%; padding: 10px; border-radius: 4px; border: 1px solid #0f3460; background: #16213e; color: #fff; }
        .btn { display: block; width: 100%; padding: 14px; background: #e94560; color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; margin-top: 20px; text-align: center; text-decoration: none; }
        .install-link { margin-top: 15px; display: block; text-align: center; color: #e94560; }
      </style>
    </head>
    <body>
      <h1>🎌 Anime Catalogs</h1>
      <p>Configura las opciones avanzadas antes de instalar:</p>
      <div class="form-group">
        <label>RPDB API Key (Opcional - Para calificaciones en portadas)</label>
        <input type="text" id="rpdb" placeholder="Ej: t0ps3cr3tk3y">
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="dubbed"> Forzar catálogo "Dubbed Only"
        </label>
      </div>
      <button class="btn" onclick="install()">📺 Instalar en Stremio</button>
      <a href="#" class="install-link" id="copylink">O copiar enlace de manifiesto</a>
      <script>
        function getConfig() {
          const rpdb = document.getElementById('rpdb').value.trim();
          const dubbed = document.getElementById('dubbed').checked;
          const cfg = {};
          if (rpdb) cfg.rpdbkey = rpdb;
          if (dubbed) cfg.dubbed = true;
          return Object.keys(cfg).length ? JSON.stringify(cfg) : '';
        }
        function getUrl() {
          const cfgStr = getConfig();
          const base = '${host}';
          if (!cfgStr) return base + '/manifest.json';
          return base + '/' + encodeURIComponent(cfgStr) + '/manifest.json';
        }
        function install() {
          const url = getUrl().replace('https://', 'stremio://').replace('http://', 'stremio://');
          window.location.href = url;
        }
        document.getElementById('copylink').addEventListener('click', (e) => {
          e.preventDefault();
          navigator.clipboard.writeText(getUrl());
          alert('¡Enlace copiado! (' + getUrl() + ')');
        });
      </script>
    </body>
    </html>
  `);
});

app.get('/manifest.json', (req, res) => {
  res.json(getManifest({}));
});

app.get('/:config/manifest.json', (req, res) => {
  res.json(getManifest(parseConfig(req.params.config)));
});

async function handleCatalog(req, res) {
  const { type, id, config } = req.params;
  const cfg = parseConfig(config);
  
  let extra = {};
  if (req.params.extra) {
    extra = qs.parse(req.params.extra.replace('.json', ''));
  }
  
  try {
    let metas = [];

    if (id.startsWith('anilist-'))  metas = await fetchAniList(id);
    else if (id.startsWith('mal-')) metas = await fetchMyAnimeList(id);
    else if (id.startsWith('kitsu-')) metas = await fetchKitsu(id);
    else if (id.startsWith('anidb-')) metas = await fetchAniDB(id);

    // Apply Filters
    const isGlobalDubbed = cfg.dubbed;
    const isExtraDubbed = extra.genre === 'Dubbed';
    const isExtraTopRated = extra.genre === 'Top Rated';

    if (isGlobalDubbed || isExtraDubbed) {
      metas = metas.filter(m => {
        const sourceName = m.id.split(':')[0]; 
        const rawId = m.id.split(':')[1];
        return isDubbed(sourceName, rawId);
      });
    }

    if (isExtraTopRated) {
      metas = metas.filter(m => {
        const rating = parseFloat(m.imdbRating || 0);
        return rating >= 8.0;
      });
    }

    // Apply RPDB
    if (cfg.rpdbkey) {
      metas = metas.map(m => {
        const sourceName = m.id.split(':')[0];
        const rawId = m.id.split(':')[1];
        return applyRPDB(m, sourceName, rawId, cfg.rpdbkey);
      });
    }

    res.json({ metas });
  } catch (err) {
    console.error('[catalog error]', err.message);
    res.json({ metas: [] });
  }
}

app.get('/catalog/:type/:id.json', handleCatalog);
app.get('/catalog/:type/:id/:extra', handleCatalog);
app.get('/:config/catalog/:type/:id.json', handleCatalog);
app.get('/:config/catalog/:type/:id/:extra', handleCatalog);

app.listen(PORT, () => console.log(`✅ Addon corriendo en http://localhost:${PORT}`));

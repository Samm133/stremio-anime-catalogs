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

function parseConfig(configStr) {
  let cfg = { rpdbkey: '', dubbed: false };
  if (!configStr) return cfg;
  try {
    const parsed = JSON.parse(decodeURIComponent(configStr));
    return { ...cfg, ...parsed };
  } catch(e) {
    return cfg;
  }
}

function getManifest(config, hasConfig) {
  const manifest = {
    id: 'community.anime-catalogs-clone',
    version: '1.0.0',
    name: config.dubbed ? 'Dubbed Anime Catalogs' : 'Anime Catalogs',
    description: 'Catálogos de anime desde AniList, MyAnimeList, Kitsu y AniDB. Soporta RPDB y Dubbed.',
    logo: 'https://dl.strem.io/addon-logo.png',
    resources: ['catalog'],
    types: ['anime', 'series', 'movie'],
    idPrefixes: ['kitsu:', 'mal:', 'anilist:'],
    // Only mark as configurable (shows gear icon), never block installation
    behaviorHints: { configurable: true },
    catalogs: baseCatalogs.map(c => ({
      ...c,
      name: config.dubbed ? `Dubbed ${c.name}` : c.name,
      extra: [
        { name: 'genre', options: ['Top Rated', 'Dubbed'] },
        { name: 'skip' }
      ]
    }))
  };
  return manifest;
}

// ─── Configure page (serves for both /configure and /:config/configure) ───────
function serveConfigure(req, res) {
  const host = process.env.ADDON_URL || ('http://localhost:' + PORT);
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Anime Catalogs - Configurar</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', sans-serif; background: #0d1117; color: #e6edf3; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 32px; max-width: 460px; width: 100%; }
    h1 { font-size: 22px; margin-bottom: 6px; color: #ff6b6b; }
    .subtitle { color: #8b949e; font-size: 14px; margin-bottom: 28px; }
    .field { margin-bottom: 20px; }
    label { display: block; font-size: 13px; color: #8b949e; margin-bottom: 6px; font-weight: 500; }
    input[type="text"] { width: 100%; padding: 10px 14px; background: #0d1117; border: 1px solid #30363d; border-radius: 8px; color: #e6edf3; font-size: 14px; outline: none; transition: border-color 0.2s; }
    input[type="text"]:focus { border-color: #ff6b6b; }
    .toggle-row { display: flex; align-items: center; gap: 12px; cursor: pointer; }
    .toggle { width: 44px; height: 24px; background: #30363d; border-radius: 12px; position: relative; transition: background 0.2s; flex-shrink: 0; }
    .toggle.on { background: #ff6b6b; }
    .toggle::after { content: ''; position: absolute; width: 18px; height: 18px; background: white; border-radius: 50%; top: 3px; left: 3px; transition: transform 0.2s; }
    .toggle.on::after { transform: translateX(20px); }
    .toggle-label { font-size: 14px; color: #e6edf3; }
    .toggle-sub { font-size: 12px; color: #8b949e; }
    .btn-install { width: 100%; padding: 14px; background: #ff6b6b; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 28px; transition: background 0.2s; }
    .btn-install:hover { background: #e05555; }
    .copy-row { display: flex; gap: 8px; margin-top: 14px; }
    .url-box { flex: 1; padding: 10px 12px; background: #0d1117; border: 1px solid #30363d; border-radius: 8px; color: #8b949e; font-size: 12px; word-break: break-all; font-family: monospace; }
    .btn-copy { padding: 10px 16px; background: #21262d; border: 1px solid #30363d; color: #e6edf3; border-radius: 8px; cursor: pointer; font-size: 13px; white-space: nowrap; transition: background 0.2s; }
    .btn-copy:hover { background: #30363d; }
    .badge { display: inline-block; padding: 2px 8px; background: #1f2937; border-radius: 10px; font-size: 11px; color: #fbbf24; margin-left: 8px; }
  </style>
</head>
<body>
<div class="card">
  <h1>🎌 Anime Catalogs</h1>
  <p class="subtitle">Configura las opciones y presiona "Instalar en Stremio"</p>

  <div class="field">
    <label>RPDB API Key <span class="badge">Opcional</span></label>
    <input type="text" id="rpdb" placeholder="Para calificaciones visuales en portadas (ratingposterdb.com)">
  </div>

  <div class="field">
    <label>Modo doblado (Dubbed Only)</label>
    <div class="toggle-row" onclick="toggleDub()">
      <div class="toggle" id="dub-toggle"></div>
      <div>
        <div class="toggle-label">Mostrar solo contenido doblado al inglés</div>
        <div class="toggle-sub">Filtra todos los catálogos usando la lista MAL-Dubs</div>
      </div>
    </div>
  </div>

  <button class="btn-install" onclick="install()">📺 Instalar en Stremio</button>

  <div class="copy-row">
    <div class="url-box" id="urlbox">${host}/manifest.json</div>
    <button class="btn-copy" onclick="copyUrl()">Copiar URL</button>
  </div>
</div>

<script>
  let dubOn = false;
  const host = '${host}';

  function toggleDub() {
    dubOn = !dubOn;
    document.getElementById('dub-toggle').classList.toggle('on', dubOn);
    updateUrl();
  }

  function getConfig() {
    const rpdb = document.getElementById('rpdb').value.trim();
    const cfg = {};
    if (rpdb) cfg.rpdbkey = rpdb;
    if (dubOn) cfg.dubbed = true;
    return Object.keys(cfg).length ? JSON.stringify(cfg) : null;
  }

  function getManifestUrl() {
    const cfg = getConfig();
    return cfg ? host + '/' + encodeURIComponent(cfg) + '/manifest.json' : host + '/manifest.json';
  }

  function updateUrl() {
    document.getElementById('urlbox').textContent = getManifestUrl();
  }

  function install() {
    const url = getManifestUrl().replace(/^https:\/\//, 'stremio://').replace(/^http:\/\//, 'stremio://');
    window.open(url, '_self');
  }

  function copyUrl() {
    const url = getManifestUrl();
    navigator.clipboard.writeText(url).then(() => alert('¡URL copiada!\\n' + url));
  }

  document.getElementById('rpdb').addEventListener('input', updateUrl);
</script>
</body>
</html>`);
}

// ─── Routes ──────────────────────────────────────────────────────────────────

app.get('/', (req, res) => res.redirect('/configure'));

// Both /configure and /:config/configure serve the same config page
app.get('/configure', serveConfigure);
app.get('/:config/configure', serveConfigure);

// Manifest routes
app.get('/manifest.json', (req, res) => {
  res.json(getManifest({}, false));
});

app.get('/:config/manifest.json', (req, res) => {
  const cfg = parseConfig(req.params.config);
  res.json(getManifest(cfg, true));
});

// ─── Catalog handler ──────────────────────────────────────────────────────────
async function handleCatalog(req, res) {
  const { type, id } = req.params;
  const cfg = parseConfig(req.params.config || '');

  // Parse extra params from the URL segment (e.g. genre=Dubbed or skip=20)
  let extra = {};
  if (req.params.extra) {
    extra = qs.parse(req.params.extra.replace(/\.json$/, ''));
  }

  try {
    let metas = [];

    if (id.startsWith('anilist-'))       metas = await fetchAniList(id);
    else if (id.startsWith('mal-'))      metas = await fetchMyAnimeList(id);
    else if (id.startsWith('kitsu-'))    metas = await fetchKitsu(id);
    else if (id.startsWith('anidb-'))    metas = await fetchAniDB(id);

    // ── Filter: Dubbed ──
    if (cfg.dubbed || extra.genre === 'Dubbed') {
      metas = metas.filter(m => {
        const [source, rawId] = m.id.split(':');
        return isDubbed(source, rawId);
      });
    }

    // ── Filter: Top Rated ──
    if (extra.genre === 'Top Rated') {
      metas = metas.filter(m => parseFloat(m.imdbRating || 0) >= 8.0);
    }

    // ── RPDB poster replacement ──
    if (cfg.rpdbkey) {
      metas = metas.map(m => {
        const [source, rawId] = m.id.split(':');
        return applyRPDB(m, source, rawId, cfg.rpdbkey);
      });
    }

    res.json({ metas });
  } catch (err) {
    console.error('[catalog error]', err.message);
    res.json({ metas: [] });
  }
}

// Without config prefix
app.get('/catalog/:type/:id.json', handleCatalog);
app.get('/catalog/:type/:id/:extra', handleCatalog);

// With config prefix
app.get('/:config/catalog/:type/:id.json', handleCatalog);
app.get('/:config/catalog/:type/:id/:extra', handleCatalog);

app.listen(PORT, () => console.log(`✅ Addon corriendo en http://localhost:${PORT}`));

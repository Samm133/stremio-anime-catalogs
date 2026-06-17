const express = require('express');
const cors = require('cors');
const { fetchAniList } = require('./sources/anilist');
const { fetchMyAnimeList } = require('./sources/mal');
const { fetchKitsu } = require('./sources/kitsu');
const { fetchAniDB } = require('./sources/anidb');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 7000;

// ─── Manifest ───────────────────────────────────────────────────────────────
const MANIFEST = {
  id: 'community.anime-catalogs-clone',
  version: '1.0.0',
  name: 'Anime Catalogs',
  description: 'Catálogos de anime desde AniList, MyAnimeList, Kitsu y AniDB',
  logo: 'https://dl.strem.io/addon-logo.png',
  resources: ['catalog'],
  types: ['anime', 'series', 'movie'],
  idPrefixes: ['kitsu:', 'mal:', 'anilist:'],
  catalogs: [
    // AniList
    { type: 'anime', id: 'anilist-trending',      name: 'AniList - Trending Now' },
    { type: 'anime', id: 'anilist-popular',       name: 'AniList - Popular This Season' },
    { type: 'anime', id: 'anilist-all-time',      name: 'AniList - All Time Popular' },
    { type: 'anime', id: 'anilist-top',           name: 'AniList - Top Anime' },
    // MyAnimeList
    { type: 'anime', id: 'mal-top-all',           name: 'MyAnimeList - Top All Time' },
    { type: 'anime', id: 'mal-airing',            name: 'MyAnimeList - Top Airing' },
    { type: 'anime', id: 'mal-popular',           name: 'MyAnimeList - Popular' },
    { type: 'anime', id: 'mal-movies',            name: 'MyAnimeList - Top Movies' },
    // Kitsu
    { type: 'anime', id: 'kitsu-airing',          name: 'Kitsu - Top Airing' },
    { type: 'anime', id: 'kitsu-popular',         name: 'Kitsu - Most Popular' },
    { type: 'anime', id: 'kitsu-rated',           name: 'Kitsu - Highest Rated' },
    { type: 'anime', id: 'kitsu-newest',          name: 'Kitsu - Newest' },
    // AniDB
    { type: 'anime', id: 'anidb-popular',         name: 'AniDB - Popular' },
  ]
};

// ─── Routes ─────────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.redirect('/configure'));

app.get('/configure', (req, res) => {
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
        .btn { display: block; width: 100%; padding: 14px; background: #e94560; color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; margin-top: 20px; text-align: center; text-decoration: none; }
        p { color: #aaa; font-size: 14px; }
        code { background: #0f3460; padding: 8px 12px; border-radius: 6px; display: block; word-break: break-all; margin: 10px 0; font-size: 13px; }
      </style>
    </head>
    <body>
      <h1>🎌 Anime Catalogs</h1>
      <p>Addon con catálogos de AniList, MyAnimeList, Kitsu y AniDB.</p>
      <p><strong>URL del manifest para instalar manualmente en Stremio:</strong></p>
      <code>${process.env.ADDON_URL || 'http://localhost:' + PORT}/manifest.json</code>
      <a class="btn" href="stremio://${(process.env.ADDON_URL || 'localhost:' + PORT).replace('https://', '').replace('http://', '')}/manifest.json">
        📺 Instalar en Stremio
      </a>
    </body>
    </html>
  `);
});

app.get('/manifest.json', (req, res) => {
  res.json(MANIFEST);
});

app.get('/catalog/:type/:id.json', async (req, res) => {
  const { type, id } = req.params;
  console.log(`[catalog] type=${type} id=${id}`);

  try {
    let metas = [];

    if (id.startsWith('anilist-'))  metas = await fetchAniList(id);
    else if (id.startsWith('mal-')) metas = await fetchMyAnimeList(id);
    else if (id.startsWith('kitsu-')) metas = await fetchKitsu(id);
    else if (id.startsWith('anidb-')) metas = await fetchAniDB(id);

    res.json({ metas });
  } catch (err) {
    console.error('[catalog error]', err.message);
    res.json({ metas: [] });
  }
});

app.listen(PORT, () => console.log(`✅ Addon corriendo en http://localhost:${PORT}`));

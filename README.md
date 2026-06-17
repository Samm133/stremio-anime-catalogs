# 🎌 Stremio Anime Catalogs

Addon para Stremio con catálogos de anime desde AniList, MyAnimeList, Kitsu y AniDB.

## Catálogos incluidos

- **AniList**: Trending, Popular This Season, All Time Popular, Top Anime
- **MyAnimeList**: Top All Time, Top Airing, Popular, Top Movies
- **Kitsu**: Top Airing, Most Popular, Highest Rated, Newest
- **AniDB**: Popular

## Instalación local (para probar)

```bash
npm install
npm start
```

Luego en Stremio pega: `http://localhost:7000/manifest.json`

## Despliegue en Render.com (gratis)

1. Sube este proyecto a GitHub
2. Ve a [render.com](https://render.com) y crea una cuenta
3. Clic en **New → Web Service**
4. Conecta tu repositorio de GitHub
5. Configura así:
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
6. En **Environment Variables** agrega:
   - `ADDON_URL` = `https://TU-NOMBRE.onrender.com`
7. Clic en **Deploy**
8. Una vez desplegado, instala en Stremio con la URL:
   `https://TU-NOMBRE.onrender.com/manifest.json`

## Notas

- AniDB no tiene API pública, sus catálogos se sirven via AniList
- Jikan (MyAnimeList) tiene rate limit de ~3 req/seg, hay un delay de 400ms incluido
- El addon no provee streams, solo catálogos de descubrimiento

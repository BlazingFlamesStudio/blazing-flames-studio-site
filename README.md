# Blazing Flames Studio — AMV Showcase

A responsive two-page website for **Blaze Eilun / Blazing Flames Studio**, with a Home page, About page, featured AMVs, and automatically updated carousels.

## Website

- Homepage: `index.html`
- About: `about.html`
- Appearance: `styles.css`
- Logo-led design layer: `theme.css` (loaded after base styles)
- Carousels / embedded player / filters: `script.js`
- Featured offline fallback: `videos.js`
- Auto-updating public catalog: `videos.json`
- Private YouTube API sync: `sync_youtube.py`
- Scheduled GitHub Action: `.github/workflows/sync-amvs.yml`

The website reads the JSON file in the browser; no secret/API key is embedded in a webpage.

## The Moonlit Archive — blue-and-white lunar redesign

The site's final visual layer is `lunar.css`, loaded after `styles.css`, `theme.css`, and `cinematic.css`. The Home and About pages use the same palette of midnight sapphire, frosted moon-white, crystalline cyan, and polished silver. `moon-sanctum.svg` is an original vector illustration inspired by the *atmosphere* of Silvermoon Hall in Genshin Impact: a glowing moon orb wrapped in crescent architecture, glittering stars, and a field of blue flowers. It is not a Genshin screenshot or copied game asset.

The visual overhaul changes the homepage hero, typography, header and navigation, playlist-world portals, featured AMV controls, AMV WARS banner, carousel stage borders, creator/achievement panels, About page, footer and player colors. Existing playlist membership, all 758 current video records, and the YouTube API/GitHub Actions workflow remain unchanged. Functional video cards still show the corresponding YouTube video thumbnails, but there is **no standalone thumbnail showcase**.

The new artwork is served locally as SVG from the GitHub repository. Reduced-motion preferences disable the additional floating/moon animations. To revise the theme in the future, edit `lunar.css` rather than adding more overrides to `styles.css`.

## Channel-brand design

Both the Home and About pages now use a shared **Prismatic Ember** theme defined in `theme.css`. The actual Blazing Flames Studio profile image, supplied by the channel owner, appears in the navigation, homepage hero, About page, footer, and social preview. It is referenced from the existing YouTube image URL rather than stored in the GitHub repository. If that remote image URL expires, it should be replaced with a local image asset and the links in `index.html`, `about.html`, and `theme.css` updated. The original `favicon.svg` remains a fallback.

The redesign is presentation-only: the YouTube playlist sync, interactive carousel library, and video player remain operational without needing the theme file.

## One-time publishing steps

1. Open [repository Pages settings](https://github.com/BlazingFlamesStudio/blazing-flames-studio-site/settings/pages). Under **Build and deployment**, choose **Deploy from a branch**, select **main** and **/(root)**, then save. The site should become available at **https://blazingflamesstudio.github.io/blazing-flames-studio-site/** after GitHub publishes it.
2. Open [Google Cloud Console](https://console.cloud.google.com/). Create/select a project, enable **YouTube Data API v3**, then generate a read-only API key in **APIs & Services → Credentials**. Restrict it to YouTube Data API v3 where possible.
3. Open [Actions secrets](https://github.com/BlazingFlamesStudio/blazing-flames-studio-site/settings/secrets/actions). Choose **New repository secret**; name it **YOUTUBE_API_KEY** and paste the key in the secret value. **Do not paste it into a public file or chat.**
4. Open [GitHub Actions](https://github.com/BlazingFlamesStudio/blazing-flames-studio-site/actions/workflows/sync-amvs.yml). Enable workflows if GitHub asks, choose **Run workflow** on the **main** branch, and confirm the run succeeds.
5. Under repository **Settings → Actions → General → Workflow permissions**, ensure Actions may write repository contents (the workflow requests `contents: write`). If you see a permission-denied error on the commit step, enable **Read and write permissions** there.

Once the first playlist synchronization succeeds, the website displays each qualifying **public YouTube playlist as its own AMV carousel**. Every playlist is scanned page by page, without a 24-video or 50-video cap. Videos are shown in the same order as the YouTube playlist, and new public entries are synchronized automatically **every six hours** (UTC cron at 02:17, 08:17, 14:17 and 20:17). GitHub may occasionally delay scheduled runs.

## Using complete YouTube playlists

The sync first resolves the channel ID of **@BlazingFlamesStudio**, then scans all of the channel's public playlists using the YouTube Data API. By default, it selects playlists whose names contain **AMV / GMV / MV / music video / edit** terms, or game names such as Genshin Impact, Honkai: Star Rail, Wuthering Waves and Zenless Zone Zero (excluding game-only livestream/gameplay collections). AMV/GMV Shorts playlists are allowed. This is playlist-based selection: video titles no longer need AMV keywords and there is **no minimum video length**.

Each playlist's `playlistItems.list` results are fetched **50 at a time until the last page**. Private, deleted or inaccessible videos are skipped, since they cannot be viewed publicly. The channel playlist's video order is preserved; the library also includes a combined Latest AMVs shelf and the existing handpicked featured shelf. The browser displays 32 cards at first and automatically appends more as users scroll; it does **not** truncate the playlist.

To show **exactly** the playlists you want, instead of using title discovery:

1. Open [Actions variables](https://github.com/BlazingFlamesStudio/blazing-flames-studio-site/settings/variables/actions).
2. Add a repository variable named `YOUTUBE_PLAYLIST_IDS` with the IDs of your **public** AMV playlists, separated by commas. The playlist ID is the value after `list=` in a YouTube playlist URL. Example format: `PLexampleOne,PLexampleTwo` (illustrative IDs only).
3. Open [GitHub Actions — playlist sync](https://github.com/BlazingFlamesStudio/blazing-flames-studio-site/actions/workflows/sync-amvs.yml) and choose **Run workflow**, on `main`. The first successful run updates `videos.json`, then the site uses the real playlist data. A secret named `YOUTUBE_API_KEY` with YouTube Data API v3 enabled must already exist.
4. Alternatively, set the repository variable `YOUTUBE_PLAYLIST_MODE` to `all` to show *all* public channel playlists, including non-AMV playlists. This is not recommended if the channel also has VOD/gameplay collections.

**Setup and troubleshooting:** If the site still shows the seven starter videos, `videos.json` has not been synchronized yet. Run the workflow and inspect the job logs; a missing secret, API quota issue, or no matching public playlist can prevent the sync. The job preserves the previous catalogue on errors rather than replacing it with empty data. Some YouTube videos may not permit embedding; every video links to YouTube for direct viewing.

## Security

The YouTube API key is a private Actions secret and is never published to the frontend. The browser fetches only the public, static `videos.json` document. Never commit an API key to the repository.

## Testing locally

Serve the folder with `python3 -m http.server 8000` and open http://localhost:8000. The starter AMVs also display when `index.html` is opened directly, but JSON fetches may not load from `file://`.

## Scope

This repository currently publishes the Home and About pages and the AMV/GMV library only. The previous VTuber model catalogue, 3D viewer, model preview assets, upload helpers, and public model storage manifest were removed in preparation for a new design. Original VRM files and external storage are managed separately and were not altered by this repository cleanup.

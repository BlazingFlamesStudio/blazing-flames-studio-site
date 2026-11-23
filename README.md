# Blazing Flames Studio — AMV Showcase

A responsive three-page website for **Blaze Eilun / Blazing Flames Studio**, with a Home page, About page, featured AMVs, and automatically updated carousels.

## Website

- Homepage: `index.html`
- About: `about.html`
- Model archive: `models.html`
- Appearance: `styles.css`
- Carousels / embedded player / filters: `script.js`
- Featured offline fallback: `videos.js`
- Auto-updating public catalog: `videos.json`
- Private YouTube API sync: `sync_youtube.py`
- Scheduled GitHub Action: `.github/workflows/sync-amvs.yml`

The website reads the JSON file in the browser; no secret/API key is embedded in a webpage.

## One-time publishing steps

1. Open [repository Pages settings](https://github.com/BlazingFlamesStudio/blazing-flames-studio-site/settings/pages). Under **Build and deployment**, choose **Deploy from a branch**, select **main** and **/(root)**, then save. The site should become available at **https://blazingflamesstudio.github.io/blazing-flames-studio-site/** after GitHub publishes it.
2. Open [Google Cloud Console](https://console.cloud.google.com/). Create/select a project, enable **YouTube Data API v3**, then generate a read-only API key in **APIs & Services → Credentials**. Restrict it to YouTube Data API v3 where possible.
3. Open [Actions secrets](https://github.com/BlazingFlamesStudio/blazing-flames-studio-site/settings/secrets/actions). Choose **New repository secret**; name it **YOUTUBE_API_KEY** and paste the key in the secret value. **Do not paste it into a public file or chat.**
4. Open [GitHub Actions](https://github.com/BlazingFlamesStudio/blazing-flames-studio-site/actions/workflows/sync-amvs.yml). Enable workflows if GitHub asks, choose **Run workflow** on the **main** branch, and confirm the run succeeds.
5. Under repository **Settings → Actions → General → Workflow permissions**, ensure Actions may write repository contents (the workflow requests `contents: write`). If you see a permission-denied error on the commit step, enable **Read and write permissions** there.

Once the first sync succeeds, the website will display a fresh **Latest AMVs** carousel and game-specific carousels. New uploads are checked **every six hours** (UTC cron at 02:17, 08:17, 14:17, 20:17); GitHub may occasionally delay scheduled runs.

## How AMVs are selected

By default, the sync scans up to **1,500 recent uploads** on **@BlazingFlamesStudio**, adds public videos at least **60 seconds** long with AMV/GMV/MV/etc. indicators in titles or tags, and excludes obvious livestreams, reactions, tutorials and gameplay. It sorts matching uploads into **Genshin Impact**, **Honkai: Star Rail**, and **Other Worlds** (including Wuthering Waves and Zenless Zone Zero). Featured selections are preserved.

Uploads without any matching AMV indicator in their titles/tags may be missed. For a more accurate library, set the optional `YOUTUBE_AMV_PLAYLIST_ID` environment variable in the sync workflow to your **public AMV-only playlist ID**; when supplied, matching playlist videos do not need the keywords. This is a configurable filter, not a guarantee all videos will be recognized.

To include Shorts, change `YOUTUBE_MIN_SECONDS: '60'` in the workflow to `'0'`. Update the cron schedule in `.github/workflows/sync-amvs.yml` to change frequency.

Existing catalog entries remain stored when older uploads fall out of the scan range. Featured AMVs remain handpicked and the hero thumbnail is separately set in `index.html`. Some YouTube videos cannot embed due to restrictions; the player has a direct **Watch on YouTube** link.

## Testing locally

Serve the folder with `python3 -m http.server 8000` and open http://localhost:8000. The starter AMVs also display when `index.html` is opened directly, but JSON fetches may not load from `file://`.

## Security

The GitHub Actions secret stays private to the job environment. **Never commit API keys** to this repository. If YouTube API calls fail or credentials have not been configured, the previously committed catalog remains on the site.


## Blaze Silver VTuber model archive

The website now has a third page: **`models.html`**, which is a searchable, responsive collection of **71 distinct model looks and variants** from 80 uploaded VRM files. Nine repeated uploads with matching embedded portraits were collapsed; fixed versions, named outfits, and alternate forms were retained as separate entries.

- `models.html` — gallery page with search, sorting, category filters, and profile dialogues
- `models.js` — model catalog rendering and image-fallback logic
- `models-data.js` and `models.json` — mirrored metadata for file:// browsing and GitHub Pages
- `model-preview-atlas.svg` — **small, public, embedded preview image** of the 71 portraits; does not include VRM meshes, rigging, or full-resolution textures

The source VRM files are **not** published to GitHub.

### Upgrade to higher-resolution portraits (optional, recommended)

From the high-resolution preview-assets ZIP, upload these **six** files into the repository root via **Add file → Upload files**:

- `blaze-eilun.webp` (user-supplied reference portrait for the homepage and About page)
- `model-atlas-01.webp`
- `model-atlas-02.webp`
- `model-atlas-03.webp`
- `model-atlas-04.webp`
- `model-atlas-05.webp`

The model gallery **automatically prefers** the higher-resolution WebP sheets when available, and otherwise uses the small embedded atlas. The user-supplied Blaze portrait is optional; without it, the site's cosmic/ember artwork remains visible. There is also an optional `celestial-brand-emblem.webp` in the pack for future branding work.

### Add more models later

Additional VRM uploads can be inspected offline and their **embedded preview portrait thumbnails** can be extracted. Add their metadata to both `models.json` and `models-data.js`; update the sprite atlases and tile indices. Avoid publishing the actual `.vrm` files or embedded character textures. Use model name and variant names as provided; do not infer which models are actively used in current streams when that has not been confirmed.

The gallery contains no VRM download links. Any future interactive 3D viewer would require separate permission to publicly host its model data.


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



## 3D model inspection

The interactive 3D viewer is **viewer.html** and uses the open-source Three.js / pixiv three-vrm VRM loader to rotate, zoom, pan, inspect faces, and select facial expressions supported by each model. Navigate from any model card via **Inspect in 3D**, or use the header's **3D Viewer** link.

### Publishing the 3D assets

The original 80 uploaded VRM files total approximately 2.2 GB. This repository does **not** contain those original files. A separate optimized ZIP archive, **blazing-flames-3d-model-assets.zip**, contains 71 distinct `.vrm.gz` web copies. The original VRM files were left unchanged. Optimized previews reduce texture resolution to up to 768 pixels per texture and gzip the VRM to speed up browser delivery.

To make all 71 models viewable publicly:

1. Download **blazing-flames-3d-model-assets.zip** from the ChatGPT conversation, then extract it. It contains a **models** folder with files like `models/aino.vrm.gz`.
2. In this GitHub repository, open or create the **models/** folder. Use **Add file → Upload files** to upload the extracted .vrm.gz files. GitHub's web uploader supports files smaller than 25 MB; the compressed models are individually much smaller. If a browser upload fails due to total transfer size, upload in smaller batches. **Do not upload the ZIP as a single file; the viewer needs each extracted file at its expected path.**
3. Once GitHub Pages redeploys, select any model from the 3D viewer. It will fetch its optimized file from `models/<model-id>.vrm.gz`, decompress it in the browser, and render the 3D VRM.
4. The URL list lives in **asset-manifest.json**. For externally hosted files, change its `baseUrl` to the full HTTPS storage URL and each `assets` entry to a path on that host. If using external storage, configure its CORS policy to allow GET from the GitHub Pages site.
5. The interactive viewer can also accept original, uncompressed **.vrm** files directly from each visitor's computer without uploading them anywhere.

**Important:** At present, the optimized VRM files are not yet uploaded to the GitHub repository, so the public viewer cannot open a selected model until that model's file is uploaded. Selecting an unavailable model will give a clear message and a local-file alternative.

### File naming and future additions

Every model is assigned a URL using its stable model `id` from `models.json`, such as `aino`, `aventurine-fixed`, and `khaslana-evolved`. New models can be added to `models.json` and `asset-manifest.json`, with matching `models/<id>.vrm.gz` files. The archive and viewer will then include them.

### Performance

Only the selected model is downloaded, not the complete library. High-resolution textures are reduced in the optimized copies. A user's device still requires WebGL support and enough memory to parse and render the model. For copyright and redistribution considerations, hosting a model publicly makes its geometry/texture assets obtainable by viewers regardless of whether a download button is shown.

## Full-size 3D viewer (updated)

The **viewer.html** page now uses an immersive, full-width WebGL canvas rather than a small three-column view. Click **Fullscreen** (or press **F**) to expand the character viewer to the entire display, and press **Escape** or the same button to exit. The **Models** and **Details** panels are closed by default, can be opened as overlays, and collapse automatically when a model is selected.

Use **Fit full body** to automatically frame the complete 3D geometry on the screen (with the horizontal and vertical field of view both considered), even on mobile. Other controls include front, back, left, right, face close-up, pan, zoom, rotate, grid, expression presets and local VRM selection.

**Size versus resolution:** The display fills the available browser area, and imported 3D geometry is not scaled or distorted. The separately optimized VRM asset files use reduced-size textures for web performance; selecting an original .vrm file from your computer preserves its original embedded texture resolution. Hosted 3D views remain unavailable until the optimized .vrm.gz assets are uploaded to `models/` (or external storage is configured).


## Shading and lighting controls

The **Shading** button in `viewer.html` opens an adjustable lighting panel. Visitors can choose four presets:

- **Studio** (default): balanced bright key light, fill and warm rim lighting.
- **Soft:** gentle, more even illumination.
- **Dramatic:** directional contrast with stronger edge highlights.
- **Original:** the prior viewer lighting arrangement (without ground shadows by default).

Visitors can adjust overall light intensity, rim/edge lighting and shadow opacity, and toggle a soft **ground shadow**. The shadow is calculated by Three.js from the character geometry and a shadow-casting directional light; it is not baked into any textures. The panel works in fullscreen mode, on mobile, and with locally selected VRM files.

The implementation retains original VRM/MToon materials instead of forcing a different shader, so model-specific toon-shading settings still govern the final appearance. Shadow reception and lighting response can vary by the individual model and materials, and rendering soft shadows may cost more GPU resources.


## Current 3D storage: Cloudflare R2

**Current configuration:** The viewer's `asset-manifest.json` is configured with public Cloudflare R2 base URL `https://pub-fef7be833f654ebbb17c5d36a6745552.r2.dev/`. All 71 catalogue entries now point to **original full-resolution `.vrm` files**, not the former GitHub `.vrm.gz` paths. The earlier instructions about uploading compressed model files into the GitHub repository are superseded by this section.

The original model keys must use the exact filenames shown in the manifest, for example:
- `models/aino.vrm`
- `models/noelle.vrm`
- `models/khaslana-evolved.vrm`

**Upload instructions:** The file `r2-upload-originals.ps1` in this repository automates bulk uploading the original VRMs. Install Node.js; download the PowerShell script; in PowerShell run it using `powershell -ExecutionPolicy Bypass -File .\r2-upload-originals.ps1`. It prompts for the **actual R2 bucket name**, which is *not* the public `r2.dev` address, and for the directory of your original VRM files. It matches their original `Blaze Silver Model (...).vrm` names to the 71 model IDs, skips duplicate copy filenames when possible, prompts before uploading, authenticates with Wrangler through your Cloudflare account, and uploads each model at `models/<id>.vrm`. Cloudflare authentication happens locally; do not put API tokens into the website.

To load the files in the GitHub Pages viewer, the R2 bucket must have **public read access** enabled and a **CORS policy** permitting GET/HEAD from `https://blazingflamesstudio.github.io`. CORS is based on origin only, not the full URL path. A successfully uploaded example file should be publicly retrievable at `https://pub-fef7be833f654ebbb17c5d36a6745552.r2.dev/models/aino.vrm`.

The public URL alone does not prove that the R2 bucket contains any of these 71 objects. **3D viewing cannot work until the objects have been uploaded and are publicly readable.** Files hosted in R2 can be extracted/downloaded by visitors who can view the 3D models. Cloudflare's `r2.dev` domain is suitable for testing; use an R2 custom domain for production traffic.

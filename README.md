# Blazing Flames Studio — AMV Showcase

A responsive two-page website for **Blaze Eilun / Blazing Flames Studio**, with a Home page, About page, featured AMVs, and automatically updated carousels.

## Website

- Homepage: `index.html`
- Full-resolution VRM viewer: `viewer.html`, `viewer.css`, `viewer.js`
- About: `about.html`
- Appearance: `styles.css`
- Logo-led design layer: `theme.css` (loaded after base styles)
- Carousels / embedded player / filters: `script.js`
- Featured offline fallback: `videos.js`
- Auto-updating public catalog: `videos.json`
- Private YouTube API sync: `sync_youtube.py`
- Scheduled GitHub Action: `.github/workflows/sync-amvs.yml`

The website reads the JSON file in the browser; no secret/API key is embedded in a webpage.

## Full-resolution VRM viewer — GitHub Releases

- Page: `viewer.html`, styled by `viewer.css` and controlled by `viewer.js`.
- 3D engine: three.js with @pixiv/three-vrm (VRM 0.x / VRM 1.0).
- Viewer reads the **public GitHub Releases API** at `https://api.github.com/repos/BlazingFlamesStudio/blazing-flames-studio-site/releases?per_page=100` and lists assets with names ending in `.vrm`.
- The first published test asset is **`Blaze.Silver.Model.Aino.vrm`** in release `vrm-archive-v1`. Its GitHub-reported digest is `sha256:1aa4c303d2efd47a0ac595ccee6ba63fd7b02de28ce91a1a301dbdc264eb5006`.
- Users can rotate, zoom, pan, adjust lighting, toggle a grid, and open a local `.vrm`. The browser preview does not upload files, intentionally decimate meshes, or resample textures.
- **Important:** GitHub Release asset downloads may lack CORS headers required for `GLTFLoader` browser fetches. Direct model loading can fail. Each catalogue entry includes a Download original link so a user can save the `.vrm`, then click **Preview a VRM from your computer**. This local import works without depending on GitHub's release-asset CORS response.
- The model release is public. Anyone can download the VRM assets.

### Add more models

1. Open `https://github.com/BlazingFlamesStudio/blazing-flames-studio-site/releases/tag/vrm-archive-v1`.
2. Select **Edit release**, attach additional original `.vrm` files as release assets, and save.
3. Refresh the 3D viewer; new VRM names appear from GitHub Releases automatically. Alternatively, create another release for the next volume.
4. Do not paste a GitHub checksum (`sha256:...`) into the public VRM URL field; the checksum verifies an upload but is not a download link.

GitHub's release assets should be treated as a **trial storage path**, not guaranteed limitless CDN hosting or a guaranteed direct-fetch API for 3D viewers. For 20+ GB, monitor GitHub usage and distribution policies. `viewer.js` is isolated from the AMV catalogue and does not affect YouTube playlist synchronization.


## Cinematic layout with blue-and-white moonlit colors

The website uses the original cinematic AMV layout from before the full Silvermoon-inspired redesign: a musical-disc featured video, cinematic hero typography, six themed world portals, AMV WARS arena, complete video carousels, and the creator manifesto on the About page.

The final stylesheet, `lunar.css`, now applies **color-only overrides** (sapphire blue, frosted white, silver and cyan) after `styles.css`, `theme.css`, and `cinematic.css`. It intentionally avoids modifying grid structure, spacing, fonts, image placement, or interactive behavior.

The illustration `moon-sanctum.svg` remains in the repository as an optional unused asset; it is **not displayed** in the restored layout. All public playlists, automatic YouTube sync, video player controls, and responsive behaviors are unchanged. No standalone thumbnail showcase was added.

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

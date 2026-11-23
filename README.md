# Blazing Flames Studio — AMV Showcase

A responsive website for **Blaze Eilun / Blazing Flames Studio**, with a Home page, About page, featured AMVs, and automatically updated carousels.

## Moonveil visual identity — official channel artwork

The site-wide visual system now follows the owner-provided official channel image (a silver-haired figure in a luminous blue/violet garden with hanging wisteria and prismatic spheres).

- **Mood:** ethereal moonlit sanctuary; quiet magic, crystalline glow, violet blossoms, silver-blue light, and midnight-blue shadows.
- **Palette:** midnight `#090e26`, deep-violet `#292761`, wisteria `#b8a0f5`, moon-silver `#e4e6ff`, prism-cyan `#8ce5ff`, and moon-white `#f7f4ff`.
- **Typography:** `Cinzel` for editorial fantasy titles; existing `DM Sans` for readable interface and body text.
- **Artwork:** `assets/channel-moonlit.webp` is an **optimized 320×180 derivative** of the official 2048×1152 image used as site branding and atmospheric art. The original high-resolution upload is not stored in this public repository. For sharp hero or gallery images at large screen sizes, replace the WebP with a higher-resolution export of the same approved artwork. `assets/channel-moonlit.svg` contains the same compact derivative as a legacy-compatible SVG wrapper; the website uses the WebP.
- **Shared styling:** `moonveil.css` is loaded last on Home, About, AMV Game, Collaborations and 3D Preview pages. Keep this layer last when introducing new page styles to preserve consistent branding.
- **About page:** a new Official Channel Artwork gallery shows the imagery and explains the visual identity.
- **Interaction:** AMV library, YouTube synchronization, Oracle matching, collaborator links and preview-only model protections are unchanged. The redesign is CSS and public branding assets only.

## Website

- Homepage: `index.html`
- Character discovery game: `amv-game.html`, `amv-game.css`, `amv-game.js`
- Creator collaborations: `collaborations.html`, `collaborations.css`, `collaborations.js`
- Reduced-detail 3D model previews: `viewer.html`, `viewer.css`, `viewer.js`, `previews.json`
- About: `about.html`
- Appearance: `styles.css`
- Logo-led design layer: `theme.css` (loaded after base styles)
- Carousels / embedded player / filters: `script.js`
- Featured offline fallback: `videos.js`
- Auto-updating public catalog: `videos.json`
- Private YouTube API sync: `sync_youtube.py`
- Scheduled GitHub Action: `.github/workflows/sync-amvs.yml`

The website reads the JSON file in the browser; no secret/API key is embedded in a webpage.

## Creator Collaborations — featured creators

- Page: `collaborations.html`, styled by `collaborations.css` and powered by `collaborations.js`.
- Profiles are linked to the exact channels supplied by the owner:
  - **PhoenixMay** — `https://www.youtube.com/@phoenixmay23`
  - **BetterBoomstick** — `https://www.twitch.tv/betterboomstick`
  - **KeriAyra** — `https://www.twitch.tv/keriarya`
  - **LadyNyx12** — `https://www.twitch.tv/ladynyx12`
  - **NoelleMains Community Festival (Discord)** — `https://discord.gg/2jJxPZanyu`
- Cards use stylized initials rather than unverified or scraped avatars; the festival is shown as a community collaborator, not an individual creator. Replace these with approved profile images later if provided.
- No unsupported biography, follower totals, or specific collaboration attribution is asserted. The owner identifies these people as collaborators.
- The page features a **separate** set of clickable video cards from the existing `Partnership AMVs` playlist (`PLCHZapUG_vAF04dcec0aOvkGjfgVssS2v`) using `videos.json`; those videos are not asserted to feature or credit any particular collaborator. If the catalogue fails, six known playlist entries are used as a fallback.
- Each profile opens the given external YouTube/Twitch channel; playlist videos open in a click-to-play YouTube modal.
- Site navigation and a compact homepage “Better Together” teaser link visitors to the creator showcase.

## Wuthering Waves universe + Oracle support

- The homepage now has **seven universe portals**, including **Wuthering Waves**, which links to the same-origin `#collection-wuwa` carousel.
- The AMV library has a **Wuthering Waves** category filter. Once the dedicated public playlist is synced, its membership is the authoritative list of WuWa AMVs, including song-only titles. Until that playlist is synced, the site temporarily falls back to titles explicitly mentioning `Wuthering Waves` or `WuWa`.
- The new playlist **Wuthering Waves AMV/GMV** (`PLB7YV6u2VvCU`) was discovered and synchronized on November 23, 2026 with **7 videos**. Its canonical YouTube link is `https://www.youtube.com/playlist?list=PLB7YV6u2VvCU`.
- The Moonlit AMV Oracle has a `wuwa` world choice with a curated list of Resonators. Only videos in the synced WuWa playlist are eligible for those world-level picks; character-specific matches still require the character's name in the title. With this playlist, Aemeath and Shorekeeper already have title-supported AMV matches.
- When no indexed video explicitly names a selected WuWa character, the Oracle may show a **clearly labeled Wuthering Waves world-level recommendation**, never a misleading named-character match.
- The YouTube synchronization auto-discovers public playlists titled with `Wuthering Waves` or `WuWa` (including when older explicit playlist IDs are configured); if the playlist is private, not included, or lacks those words in its name, a public playlist URL/ID is needed. Once synced, portal counts, carousel and Oracle update automatically. The playlist still belongs to YouTube and can be edited there.

## Moonlit AMV Oracle — character discovery game

- Link: `amv-game.html` (also linked from the homepage and navigation).
- Flow: select **All worlds**, **Genshin Impact**, **Honkai: Star Rail**, **Wuthering Waves**, or **Fire Emblem**; search or select a character; click **Reveal my AMV**.
- The game computes character matches from the same `videos.json` maintained by the existing YouTube sync and plays only IDs actually found in that catalogue. A title's mention of a character is the evidence for the match, **not a guarantee that the footage exclusively features that character**.
- About 113 characters currently have at least one named video title in the 758-video catalogue; the exact number changes as the library syncs. Names in the curated `groups` arrays of `amv-game.js` can be expanded as more names appear.
- Supports a surprise-character draw, reroll for another edit, and link sharing via `?world=...&character=...&video=...`; playback uses a click-to-open YouTube modal (no automatic audio).
- Skips obvious reactions, walkthroughs and gameplay, and avoids considering other characters' theme credits to be character AMVs. Some AMVs named only after their song are not discoverable without a separately curated character-to-video tag. Do not invent matches from unrelated videos.
- The game doesn't alter the existing AMV cards, playlist data, synchronization workflow, or the protected-preview 3D model gallery.



## Protected originals — public low-detail model previews

The website uses `viewer.html`, `viewer.js`, `viewer.css`, and `previews.json` for its 3D **preview gallery**. The viewer is intentionally a same-origin, static glTF/GLB loader and **does not call GitHub Releases, load VRMs, or expose an original-file download URL**.

- Originals: Keep private and offline or in access-controlled storage. Never upload them to GitHub Releases, GitHub Pages, the public repository, or another public storage bucket.
- Public preview files: Publish only `previews/*.glb` after reducing polygons and textures and removing the VRM rig, morph targets, animations, and metadata.
- Catalogue: `previews.json` lists display names and paths under the `previews/` directory. Aino is preconfigured to load `previews/aino-preview.glb` when uploaded.
- Viewer: Supports orbit/zoom/pan, lighting, auto-rotation, floor grid, and local preview of a previously generated `.glb` file (no upload to the site).
- All public GLB previews **are still extractable** by technically capable visitors. Only the non-published original VRM is kept inaccessible.

### Publish the Aino test preview

1. Keep your original Aino VRM on your own computer.
2. **Remove the original `.vrm` asset from the public `vrm-archive-v1` GitHub Release.** Removing a download link or leaving this asset in a release does **not** secure it. Previously downloaded copies cannot be revoked.
3. Use the separately generated `aino-preview.glb` from the working files, or run the local preview conversion script on your computer.
4. In GitHub, open the `previews/` directory and use **Add file → Upload files** to add **`aino-preview.glb`**. Never upload your `.vrm` source.
5. After GitHub Pages deploys, refresh `viewer.html` and select Aino. The viewer will fetch the **static low-detail preview** directly from the site, so GitHub Releases CORS is no longer relevant.

For future models, add further reduced-detail static `.glb` files to `previews/` and entries to `previews.json`. Observe the free GitHub Pages published-site size/bandwidth limits rather than assuming unlimited free hosting. If you see a 404 when selecting Aino before the file is uploaded, that is expected.

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

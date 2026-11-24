# Blazing Flames Studio — AMV Showcase

A responsive website for **Blaze Eilun / Blazing Flames Studio**, with a Home page, About page, featured AMVs, and automatically updated carousels.

## Moonveil visual identity — official channel artwork

The site-wide visual system now follows the owner-provided official channel image (a silver-haired figure in a luminous blue/violet garden with hanging wisteria and prismatic spheres).

- **Mood:** ethereal moonlit sanctuary; quiet magic, crystalline glow, violet blossoms, silver-blue light, and midnight-blue shadows.
- **Palette:** midnight `#090e26`, deep-violet `#292761`, wisteria `#b8a0f5`, moon-silver `#e4e6ff`, prism-cyan `#8ce5ff`, and moon-white `#f7f4ff`.
- **Typography:** `Cinzel` for editorial fantasy titles; existing `DM Sans` for readable interface and body text.
- **Artwork:** `assets/channel-moonlit.webp` is a **2048×1152 optimized WebP** (approximately 237 KiB) produced from the owner's official 2048×1152 PNG. It replaces the previously degraded 320×180 version without changing the site's visual layout. The original PNG is kept outside the public repository; the optimized full-resolution WebP is served by the website. `assets/channel-moonlit.svg` remains as a legacy low-resolution SVG wrapper but is not used by the website.
- **Shared styling:** `moonveil.css` is loaded last on Home, About, AMV Game and Collaborations pages. Keep this layer last when introducing new page styles to preserve consistent branding.
- **About page:** a new Official Channel Artwork gallery shows the imagery and explains the visual identity.
- **Interaction:** AMV library, YouTube synchronization, Oracle matching, collaborator links and preview-only model protections are unchanged. The redesign is CSS and public branding assets only.

## Website

- Homepage: `index.html`
- Character discovery game: `amv-game.html`, `amv-game.css`, `amv-game.js`
- Creator collaborations: `collaborations.html`, `collaborations.css`, `collaborations.js`
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
  - **KeriArya** — `https://www.twitch.tv/keriarya`
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
- The game doesn't alter the existing AMV cards, playlist data, or synchronization workflow.



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

This repository publishes the Home, About, AMV Oracle, Collaborations, AMV/GMV library and fresh Cloudflare-connected 3D Gallery pages. The obsolete viewer code, preview catalogue and public GLB assets remain removed. No original VRM files or R2 credentials are stored in this public repository.


## Automatic 3D Gallery — Cloudflare R2

- viewer.html: interactive browser-rendered VRM gallery with searchable dynamic model list.
- gallery-catalog.js: discovers and loads models through the Cloudflare Worker.
- cloudflare-r2-worker.js: complete Worker source to paste and deploy separately in Cloudflare. GitHub does not deploy the Worker.
- Worker routes: GET /api/models (JSON directory), GET /models/<encoded filename> (original VRM), HEAD /models/<encoded filename>.
- Only .vrm objects immediately under the private R2 models/ folder appear. Listing uses R2 cursor pagination.
- Upload or delete a model in Cloudflare, then refresh the gallery or click Test again. No manual website edits are necessary.
- The original Aino route /models/aino works until the Worker is updated; the new Worker also includes an alias.
- SECURITY: Every .vrm under models/ is discoverable and can be streamed to visitors. Browsers receiving original VRM geometry can extract the originals. CORS/Origin checks and hiding download buttons are not authentication or DRM. Do not upload files unless such exposure is acceptable.
- The public GitHub repo contains no VRM binaries, access keys, or secret tokens.
- Successful website deployment does not verify Cloudflare-side deployment; the Worker must be deployed by the owner and tested from the live page.


## Installable Blazing Flames Studio PWA (iOS / Android / desktop)

The website is now an installable Progressive Web App while continuing to run as a normal GitHub Pages website:

- **App URL:** https://blazingflamesstudio.github.io/blazing-flames-studio-site/
- **App manifest:** \`manifest.webmanifest\` — fixed GitHub project-path scope, standalone display, shortcuts for the AMV Library, Oracle, 3D Gallery and collaborators, and proper 192/512 PNG app icons.
- **App shell:** \`pwa.js\` and \`pwa.css\` — browser installation prompts where supported, iOS "Add to Home Screen" instructions, app updates, offline notifications, and compact bottom navigation when installed in standalone mode.
- **Offline page:** \`offline.html\` — branded guidance when visiting a page that has not been cached and internet is unavailable.
- **Service worker:** \`sw.js\` — network-first site pages and static assets with fallback to cached copies. The worker is scoped strictly to \`/blazing-flames-studio-site/\`; it does not claim other projects under github.io.
- **Live functionality:** video playback, Cloudflare R2 model catalog and original VRMs, 3D viewer CDN libraries and remote resources, and network-dependent animations still need an internet connection. The worker deliberately **does not cache VRM, VRMA, media files or cross-origin Cloudflare/YouTube requests**, avoiding model duplication and huge storage consumption.
- **iPhone/iPad:** Open the app URL in a browser, open **Share → Add to Home Screen**, and launch the Home Screen icon. The installed app opens without the normal browser toolbar.
- **Android/desktop Chrome and Edge:** use the browser's **Install app** action or on-page install invitation if available.
- **Publishing:** changes to HTML, JS, CSS, icons or the manifest are committed directly to the \`main\` branch. GitHub Pages deploys normally; no separate app-store submission is necessary for PWA installation. Service-worker updates are detected when the browser revisits and can show a refresh prompt.
- **Security:** installability does not change the original-file extraction limitations of client-side VRM rendering. The Cloudflare bucket remains private, but VRMs streamed for 3D viewing can still be downloaded by a technically knowledgeable visitor.

**Testing:** Open the deployed URL over HTTPS in Chrome/Edge, inspect Application → Manifest and Service Workers, confirm icons and installability, load each page, then switch offline to confirm the offline shell. Test 3D loading again online. On iPhone, add the website to the Home Screen and launch via its icon.

### Channel-branded PWA icons (November 2026)

The installed app uses the existing official channel artwork from `assets/channel-moonlit.webp`, cropped to a square to preserve its original composition, not a generated generic flame logo. The branding source is retained in the repository.

- Launcher icons: `icons/brand-192.png` and `icons/brand-512.png`.
- iOS home-screen icon: `icons/brand-180.png`.
- Android adaptive/maskable icon: `icons/brand-512-maskable.png` with a midnight-blue safe-area margin.
- Install prompt and offline page: same existing channel artwork; no original VRMs or animations are bundled.
- To regenerate icons after updating the source artwork, run `python scripts/build_brand_icons.py` with Pillow installed, or use the `Generate branded PWA icons` GitHub Actions workflow. Commits that change the artwork or generator script automatically run the workflow.
- Browser or device launchers can cache the previous icon. Remove and reinstall the Home Screen app if it still shows the old flame. The displayed app name remains `Blazing Flames` (full manifest name `Blazing Flames Studio`).

### Moonlit AMV Finder (November 24, 2026)

`finder.html` is a separate, shareable, mobile-optimized AMV Finder integrated into the homepage, all navigation menus and the installed PWA. Its search source is `videos.json`, already refreshed by the YouTube playlist-sync workflow.

- Videos qualify only when their YouTube title contains a true AMV marker: `AMV`, `AMV/GMV`, or `AMVGMV`, including adjacent formatting such as `RailAMV/GMV`. A creator name containing 'AMV' alone does not qualify.
- Visitors can search title words or songs, character names **only when present in the title**, and known game/year fields; filter by world/year, sort, or watch via YouTube's privacy-enhanced embed. Search filters are shareable as URL parameters.
- No automated guessing of video characters, songs, or whether an unrelated video is an AMV.
- The YouTube sync now checks the channel's complete uploads playlist and adds public AMV-titled uploads omitted from curated playlists, preserving existing playlist carousels. A successful scheduled sync is required before these additional videos appear on the site.
- Includes a 24-per-page responsive result grid and an offline starter collection; online results always use the updated catalog.

### Channel-wide AMV upload coverage

The existing `sync_youtube.py` now discovers the channel's uploads playlist using the YouTube Data API, paginates through the channel's upload titles, and adds public videos with an explicit AMV title marker to `videos.json` even when not listed in curated AMV playlists. The public Finder filters title markers again in the browser. All existing carousel playlist membership stays unchanged; non-AMV uploads found outside curated playlists are excluded. The optional uploads scan handles API errors without taking the playlist catalog offline, and the sync output marks whether channel-wide scanning was configured into that successful run. GitHub Actions supplies the existing `YOUTUBE_API_KEY` secret. A fresh run must complete before the Finder's indexed count grows.

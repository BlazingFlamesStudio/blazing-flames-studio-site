# Blazing Flames Studio — Auto-Updating AMV Website

A two-page, responsive AMV/GMV website for **Blazing Flames Studio / Blaze Eilun**. Home and About pages, embedded YouTube player, game-specific carousels, a curated Featured row, and an automatic **Latest AMVs** row.

## View the design

Open `index.html` in a browser. The seven curated AMVs are available immediately, even before online synchronization is set up. For a full local test of `videos.json`, run:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`. The site does not need a server when published. It never exposes your YouTube API key to site visitors.

## Enable automatic updates on GitHub Pages

Do these **one-time** setup steps:

1. **Create a GitHub repository.** Upload the **contents** of this website folder to the root of the repository (make sure `.github/workflows/sync-amvs.yml` is included). A public repository is easiest for GitHub Pages. GitHub Pages must be enabled under **Settings → Pages → Build and deployment → Deploy from a branch → main / (root)**, or the corresponding actual default branch.
2. **Get a YouTube API key.** In [Google Cloud Console](https://console.cloud.google.com/), create or select a project, enable **YouTube Data API v3**, then create an API key in **APIs & Services → Credentials**. Restrict the key to YouTube Data API v3 where possible. You only need read access to public videos; no OAuth or channel login is required.
3. **Keep that key private.** In your GitHub repository, visit **Settings → Secrets and variables → Actions → New repository secret**. Name it exactly `YOUTUBE_API_KEY`, and paste the key as the secret's value. **Never paste the key into index.html, videos.js, or another public file.**
4. **Run the first sync.** Open **Actions → Update AMV carousels from YouTube → Run workflow**. The workflow retrieves uploads from `@BlazingFlamesStudio`, filters and categorizes AMVs, and updates `videos.json` with a commit. In **Actions**, confirm the job succeeded. On GitHub Pages, the site updates after the changes deploy. If using Netlify or Cloudflare Pages, connect hosting to the GitHub repository for automatic deploys—drag-and-drop uploads do not refresh on their own.

**After setup:** The action checks YouTube every **six hours** (UTC), adds newly found matching AMVs, and preserves the existing archive. GitHub scheduled jobs are not guaranteed to run at the exact minute. The frontend fetches the refreshed `videos.json` on each visit, and falls back to curated videos when that file isn't available. No manual carousel edits are necessary.

### What counts as an AMV?

By default, the sync examines up to 1,500 recent uploads, includes public videos **at least 60 seconds** long that have `AMV`, `GMV`, `MV`, `MMV`, `MAD`, or `music video` in their title or video tags, and excludes obvious livestream, guide and reaction titles. **Videos whose title/tags don't identify them as music edits might be missed.** This avoids adding your daily gaming streams or Shorts to the AMV carousels. It does not sync instantly upon an upload; the next scheduled run is needed.

When available, the video title, tags, and description classify it into Genshin Impact, Honkai: Star Rail, or Other Worlds (including Wuthering Waves and Zenless Zone Zero). Ambiguous titles and tags will be filed in Other Worlds. You can revise `sync_youtube.py` to tailor this further.

**Best accuracy:** If you maintain a public AMV-only playlist, set the `YOUTUBE_AMV_PLAYLIST_ID` environment variable in `.github/workflows/sync-amvs.yml` to that playlist's ID. Playlist mode accepts entries without an AMV keyword, still applies the duration limit, and skips unrelated uploads not in the playlist. Use a *video playlist* rather than your channel link.

### Customize the sync

Open `.github/workflows/sync-amvs.yml` and adjust:

- `YOUTUBE_HANDLE`: your YouTube handle, currently `@BlazingFlamesStudio`.
- `YOUTUBE_SCAN_LIMIT`: how many most-recent uploads to scan (default `1500`, max `5000`); the existing catalog persists beyond the scan window.
- `YOUTUBE_MIN_SECONDS`: minimum AMV length (default `60`, set `0` to include AMV Shorts).
- `YOUTUBE_AMV_PLAYLIST_ID`: optional channel playlist ID; leave unset to scan uploads.
- `cron`: update schedule (currently every six hours).

**Cost and quotas:** YouTube Data API quotas are subject to Google's current terms and limits. The sync uses low-cost `channels.list`, `playlistItems.list`, and `videos.list` endpoints; free-tier quotas are commonly adequate but are not guaranteed. Failed runs leave the most recent `videos.json` in place.

## Website files

- `index.html`, `about.html` — the Home and About pages.
- `styles.css` — the responsive dark design.
- `script.js` — video player, carousel controls, filters, and automatic catalog loading.
- `videos.json` — stored, synced AMV collection. You can manually edit it for curated selections.
- `videos.js` — seven original AMVs used as an **offline/first-load fallback**.
- `sync_youtube.py` — runs privately inside GitHub Actions and refreshes `videos.json`.
- `.github/workflows/sync-amvs.yml` — the scheduled automation (not published as a page).
- `tests/` — local tests for matching, classification, and preserving your archive.

Run tests with:

```bash
python3 -m unittest discover -s tests -v
```

## Good to know

- The hero's featured thumbnail is handpicked; edit the YouTube ID in `index.html` if you want a different hero. The **Latest AMVs** carousel updates automatically after a successful sync.
- Videos already saved to `videos.json` stay available even if they leave the scanned upload window. To remove an old AMV, delete its item from `videos.json`.
- Some videos cannot be embedded because of YouTube/music restrictions. Every player includes a direct **Watch on YouTube** link.
- The initial videos are curated starter examples; the large-scale archive is only populated **after your first successful sync**.
- No API key, GitHub repository, hosting provider, or channel account has been connected by the packaged files alone.
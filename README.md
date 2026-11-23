# Blazing Flames Studio — AMV Showcase

A responsive two-page website for **Blaze Eilun / Blazing Flames Studio**, with a Home page, About page, featured AMVs, and automatically updated carousels.

## Website

- Homepage: `index.html`
- About: `about.html`
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

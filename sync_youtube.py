#!/usr/bin/env python3
"""Sync curated YouTube playlists plus all AMV-titled channel uploads.

Never publish a partial catalog if YouTube upload discovery fails.
The YouTube API key is only used server-side in GitHub Actions.
"""
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "videos.json"
HEALTH_OUTPUT = ROOT / "catalog-health.json"
API = "https://www.googleapis.com/youtube/v3"
HANDLE = os.getenv("YOUTUBE_HANDLE", "@BlazingFlamesStudio")
EXPLICIT = [s.strip() for s in os.getenv("YOUTUBE_PLAYLIST_IDS", "").split(",") if s.strip()]
MODE = os.getenv("YOUTUBE_PLAYLIST_MODE", "amv").strip().lower()
ID = re.compile(r"^[A-Za-z0-9_-]{11}$")
# AMV uploads include common title formatting without mistaking a creator handle for an AMV.
AMV_UPLOAD_TITLE = re.compile(r"(?:\bAMV\b|AMV/GMV|AMVGMV)", re.I)
PLAYLIST_ID = re.compile(r"^[A-Za-z0-9_-]{10,50}$")
AMV = re.compile(r"\b(?:AMVs?|GMVs?|MMVs?|MADs?|MVs?|music[ -]?videos?|video edits?|fan edits?)\b", re.I)
GAME = re.compile(r"\b(?:genshin|teyvat|honkai|star rail|HSR|wuthering waves|wuwa|zenless|ZZZ|endfield)\b", re.I)
EXCLUDE = re.compile(r"\b(?:livestreams?|streams?|vods?|gameplay|walkthroughs?|guides?|tutorials?|shorts?|clips?|reactions?|trailers?)\b", re.I)
GENSHIN = re.compile(r"\b(?:genshin|teyvat)\b", re.I)
HSR = re.compile(r"\b(?:honkai\s*[:\-]?\s*star\s*rail|star\s*rail|HSR|astral\s*express)\b", re.I)
WUWA = re.compile(r"\b(?:wuthering\s*waves|wuwa)\b", re.I)
OTHERS = [
    (re.compile(r"\b(?:wuthering\s*waves|wuwa)\b", re.I), "Wuthering Waves"),
    (re.compile(r"\b(?:zenless\s*zone\s*zero|zenless|ZZZ)\b", re.I), "Zenless Zone Zero"),
    (re.compile(r"\b(?:arknights\s*[:\-]?\s*endfield|endfield)\b", re.I), "Arknights: Endfield"),
    (re.compile(r"\b(?:honkai\s*impact\s*3(?:rd)?|HI3)\b", re.I), "Honkai Impact 3rd"),
]


def api_get(key, route, **params):
    url = API + "/" + route + "?" + urlencode(dict(params, key=key))
    try:
        with urlopen(url, timeout=40) as response:
            return json.load(response)
    except HTTPError as exc:
        # Never print the URL or response body: the URL contains the API key.
        raise RuntimeError("YouTube API request failed with HTTP " + str(exc.code)) from None
    except (URLError, TimeoutError):
        raise RuntimeError("YouTube API connection failed") from None


def channel_id(key):
    params = {"part": "id"}
    if HANDLE.startswith("UC") and len(HANDLE) == 24:
        params["id"] = HANDLE
    else:
        params["forHandle"] = HANDLE
    items = api_get(key, "channels", **params).get("items", [])
    if not items:
        raise RuntimeError("Channel not found: check YOUTUBE_HANDLE")
    return items[0]["id"]


def playlist_metadata(key):
    """Read every public channel playlist, including pagination beyond 50."""
    if EXPLICIT:
        if any(not PLAYLIST_ID.fullmatch(x) for x in EXPLICIT):
            raise RuntimeError("Invalid YOUTUBE_PLAYLIST_IDS value")
        found = {}
        for offset in range(0, len(EXPLICIT), 50):
            batch = EXPLICIT[offset:offset + 50]
            page = api_get(key, "playlists", part="snippet,contentDetails", id=",".join(batch), maxResults=50)
            found.update({v["id"]: v for v in page.get("items", [])})
        missing = [p for p in EXPLICIT if p not in found]
        if missing:
            raise RuntimeError("Some configured playlist IDs were not public or not found")
        # Always include the owner's public Wuthering Waves AMV playlist,
        # even if an older fixed list of playlist IDs was configured.
        # Its video titles may be song-only, so playlist membership is authoritative.
        channel = channel_id(key)
        token = None
        while True:
            params = {"part": "snippet,contentDetails", "channelId": channel, "maxResults": 50}
            if token:
                params["pageToken"] = token
            page = api_get(key, "playlists", **params)
            for item in page.get("items", []):
                title = item.get("snippet", {}).get("title", "")
                if WUWA.search(title) and not EXCLUDE.search(title):
                    found[item["id"]] = item
                    if item["id"] not in EXPLICIT:
                        EXPLICIT.append(item["id"])
            token = page.get("nextPageToken")
            if not token:
                break
        return [found[p] for p in dict.fromkeys(EXPLICIT)]

    channel = channel_id(key)
    playlists, token = [], None
    while True:
        params = {"part": "snippet,contentDetails", "channelId": channel, "maxResults": 50}
        if token:
            params["pageToken"] = token
        page = api_get(key, "playlists", **params)
        playlists.extend(page.get("items", []))
        token = page.get("nextPageToken")
        if not token:
            break

    if MODE == "all":
        return playlists
    if MODE != "amv":
        raise RuntimeError("YOUTUBE_PLAYLIST_MODE must be 'amv' or 'all'")
    # For public AMV carousels, skip VOD / stream / gameplay collections.
    # Also accept playlists named after a game if no other non-AMV descriptor appears.
    return [p for p in playlists
            if (AMV.search(p.get("snippet", {}).get("title", ""))
                or (GAME.search(p.get("snippet", {}).get("title", ""))
                    and not EXCLUDE.search(p.get("snippet", {}).get("title", ""))))]


def playlist_video_ids(key, playlist_id):
    """Exhaust all pages, without a 50-item or uploads scan limit."""
    ids, token = [], None
    while True:
        params = {"part": "contentDetails", "playlistId": playlist_id, "maxResults": 50}
        if token:
            params["pageToken"] = token
        page = api_get(key, "playlistItems", **params)
        for item in page.get("items", []):
            video_id = item.get("contentDetails", {}).get("videoId", "")
            if ID.fullmatch(video_id):
                ids.append(video_id)
        token = page.get("nextPageToken")
        if not token:
            break
    return ids



def channel_upload_amv_ids(key):
    """Find every AMV-titled public channel upload, even outside named playlists.

    The channel uploads playlist is paginated independently of the curated
    playlists, and each listing supplies a public title for the AMV marker
    test. A final videos.list lookup enforces public/unlisted visibility.
    """
    channel = channel_id(key)
    items = api_get(key, "channels", part="contentDetails", id=channel).get("items", [])
    if not items:
        raise RuntimeError("Channel uploads could not be discovered")
    upload_pid = items[0].get("contentDetails", {}).get("relatedPlaylists", {}).get("uploads")
    if not upload_pid or not PLAYLIST_ID.fullmatch(upload_pid):
        raise RuntimeError("Channel uploads playlist ID unavailable")
    found, seen, token, visited = [], set(), None, set()
    while True:
        if token in visited:
            raise RuntimeError("YouTube upload pagination loop detected; catalog preserved")
        visited.add(token)
        params = {"part": "snippet,contentDetails", "playlistId": upload_pid, "maxResults": 50}
        if token:
            params["pageToken"] = token
        page = api_get(key, "playlistItems", **params)
        for item in page.get("items", []):
            video_id = item.get("contentDetails", {}).get("videoId", "")
            title = item.get("snippet", {}).get("title", "")
            if ID.fullmatch(video_id) and AMV_UPLOAD_TITLE.search(title) and video_id not in seen:
                seen.add(video_id)
                found.append(video_id)
        token = page.get("nextPageToken")
        if not token:
            break
    if not found:
        raise RuntimeError("YouTube upload scan found zero AMV titles; catalog preserved")
    return found


def get_video_details(key, ids):
    data = {}
    for offset in range(0, len(ids), 50):
        batch = ids[offset:offset + 50]
        page = api_get(key, "videos", part="snippet,status", id=",".join(batch))
        for item in page.get("items", []):
            # Exclude deleted or private videos, but allow public & unlisted.
            if item.get("status", {}).get("privacyStatus") in ("public", "unlisted"):
                data[item["id"]] = item
    return data


def category(snippet):
    fields = (snippet.get("title", ""), " ".join(snippet.get("tags", [])),
              snippet.get("description", "")[:250])
    for words in fields:
        if WUWA.search(words):
            return "wuwa", "Wuthering Waves"
        if GENSHIN.search(words):
            return "genshin", "Genshin Impact"
        if HSR.search(words):
            return "hsr", "Honkai: Star Rail"
        for pattern, game in OTHERS:
            if pattern.search(words):
                return "other", game
    return "other", "Other Worlds"


def playlist_category(title):
    if WUWA.search(title):
        return "wuwa"
    if GENSHIN.search(title):
        return "genshin"
    if HSR.search(title):
        return "hsr"
    return "other" if any(p.search(title) for p, _ in OTHERS) else "all"


def main():
    key = os.getenv("YOUTUBE_API_KEY", "").strip()
    if not key:
        raise RuntimeError("Missing YOUTUBE_API_KEY: add as GitHub Actions secret")
    existing = json.loads(OUTPUT.read_text(encoding="utf-8")) if OUTPUT.exists() else {"videos": []}
    prior = {x["id"]: x for x in existing.get("videos", [])
             if isinstance(x, dict) and ID.fullmatch(x.get("id", ""))}

    own_channel_id = channel_id(key)
    playlists = playlist_metadata(key)
    if not playlists:
        raise RuntimeError("No eligible public AMV playlists found. Configure YOUTUBE_PLAYLIST_IDS or change YOUTUBE_PLAYLIST_MODE")

    raw = []
    all_ids = []
    seen_ids = set()
    for playlist in playlists:
        pid = playlist["id"]
        ids = playlist_video_ids(key, pid)
        if not ids:
            continue
        raw.append((playlist, ids))
        for video_id in ids:
            if video_id not in seen_ids:
                seen_ids.add(video_id)
                all_ids.append(video_id)

    if not all_ids:
        raise RuntimeError("Selected playlists contain no accessible video IDs; old catalogue preserved")

    # Fill gaps in the playlist-only archive using the complete channel
    # upload feed. Do not add unrelated uploads, livestreams, or reactions.
    playlist_ids = set(all_ids)
    # Channel-wide completeness is mandatory. A transient YouTube outage must
    # NOT overwrite a previously complete catalog with playlist-only results.
    channel_amvs = channel_upload_amv_ids(key)
    for video_id in channel_amvs:
        if video_id not in seen_ids:
            seen_ids.add(video_id)
            all_ids.append(video_id)
    print("Channel AMV upload scan: %d title matches, %d new to curated playlists" %
          (len(channel_amvs), len(seen_ids - playlist_ids)))

    details = get_video_details(key, all_ids)
    # A partial/invalid API response should not erase large parts of the
    # previously confirmed channel-wide AMV index.
    if len(channel_amvs) and len(details) < max(1, int(len(all_ids) * 0.85)):
        raise RuntimeError("YouTube video details incomplete; previous catalog preserved")
    if not details:
        raise RuntimeError("No public/unlisted video details returned; old catalogue preserved")

    # Curated playlist membership is authoritative: song-only edits count.
    wuwa_ids = {
        video_id
        for playlist, ids in raw
        if WUWA.search(playlist.get("snippet", {}).get("title", ""))
        for video_id in ids
    }
    videos = {}
    for video_id in all_ids:
        if video_id not in details:
            continue
        snippet = details[video_id].get("snippet", {})
        previous = prior.get(video_id, {})
        cat, game = category(snippet)
        if video_id in wuwa_ids:
            cat, game = "wuwa", "Wuthering Waves"
        videos[video_id] = {
            "id": video_id,
            "title": snippet.get("title", "Untitled AMV"),
            "game": game,
            "category": cat,
            "year": snippet.get("publishedAt", "")[:4],
            "tag": previous.get("tag", "From YouTube playlist" if video_id in playlist_ids else "From channel uploads"),
            "channelOwned": snippet.get("channelId") == own_channel_id,
            "featured": bool(previous.get("featured", False)),
            "publishedAt": snippet.get("publishedAt", "")
        }

    # Preserve explicitly featured videos only if they still have current,
    # accessible YouTube details. Never resurrect deleted/private uploads.
    for video_id, previous in prior.items():
        if previous.get("featured") and video_id not in videos and video_id in details:
            videos[video_id] = previous

    output_playlists = []
    for playlist, ids in raw:
        valid_ids = [vid for vid in ids if vid in videos]
        if not valid_ids:
            continue
        snippet = playlist.get("snippet", {})
        output_playlists.append({
            "id": playlist["id"],
            "title": snippet.get("title", "AMV Playlist"),
            "description": snippet.get("description", "")[:300],
            "category": playlist_category(snippet.get("title", "")),
            "videoIds": valid_ids
        })

    if not output_playlists:
        raise RuntimeError("No public videos were found in selected playlists; old catalogue preserved")

    ordered = sorted(videos.values(), key=lambda x: (x.get("publishedAt", ""), x["id"]), reverse=True)
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    catalog_source = "youtube-playlists-and-channel-amvs"
    changed = not (
        ordered == existing.get("videos", [])
        and output_playlists == existing.get("playlists", [])
        and existing.get("source") == catalog_source
    )
    last_change = now if changed else existing.get("updatedAt", now)
    if changed:
        data = {
            "updatedAt": now,
            "source": catalog_source,
            "playlists": output_playlists,
            "videos": ordered,
        }
        OUTPUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    # A separate small file records every successful *complete* check,
    # even when the video catalog itself has not changed.
    known_playlist = set().union(*(set(ids) for _, ids in raw))
    own_uploads = {video_id for video_id in channel_amvs
                   if video_id in details and details[video_id].get("snippet", {}).get("channelId") == own_channel_id}
    amv_index = [video for video in ordered if AMV_UPLOAD_TITLE.search(video["title"])]
    latest = next((video for video in ordered if video["id"] in own_uploads), None)
    health = {
        "status": "ok",
        "checkedAt": now,
        "catalogUpdatedAt": last_change,
        "source": catalog_source,
        "channel": HANDLE,
        "playlistCount": len(output_playlists),
        "catalogVideos": len(ordered),
        "amvTitleMatches": len(amv_index),
        "channelAMVsVerified": len(own_uploads),
        "channelAMVsOutsidePlaylists": len(own_uploads - known_playlist),
        "latestChannelAMV": {
            "id": latest["id"], "title": latest["title"],
            "publishedAt": latest["publishedAt"]
        } if latest else None,
    }
    HEALTH_OUTPUT.write_text(json.dumps(health, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Coverage verified: %d catalog videos; %d AMV-title matches; "
          "%d verified channel AMVs (%d outside playlists); %s" %
          (len(ordered), len(amv_index), len(own_uploads),
           len(own_uploads - known_playlist),
           "catalog changed" if changed else "catalog unchanged"))


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, ValueError, KeyError, OSError) as error:
        print("Sync unsuccessful: " + str(error), file=sys.stderr)
        sys.exit(1)

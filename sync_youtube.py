#!/usr/bin/env python3
"""Sync full public YouTube AMV playlists to the static site.

Discover channel playlists (or use explicit IDs), paginate every playlistItems page,
and preserve video order. YouTube API key is used only in GitHub Actions.
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
API = "https://www.googleapis.com/youtube/v3"
HANDLE = os.getenv("YOUTUBE_HANDLE", "@BlazingFlamesStudio")
EXPLICIT = [s.strip() for s in os.getenv("YOUTUBE_PLAYLIST_IDS", "").split(",") if s.strip()]
MODE = os.getenv("YOUTUBE_PLAYLIST_MODE", "amv").strip().lower()
ID = re.compile(r"^[A-Za-z0-9_-]{11}$")
PLAYLIST_ID = re.compile(r"^[A-Za-z0-9_-]{10,50}$")
AMV = re.compile(r"\b(?:AMVs?|GMVs?|MMVs?|MADs?|MVs?|music[ -]?videos?|video edits?|fan edits?)\b", re.I)
GAME = re.compile(r"\b(?:genshin|teyvat|honkai|star rail|HSR|wuthering waves|wuwa|zenless|ZZZ|endfield)\b", re.I)
EXCLUDE = re.compile(r"\b(?:livestreams?|streams?|vods?|gameplay|walkthroughs?|guides?|tutorials?|shorts?|clips?|reactions?|trailers?)\b", re.I)
GENSHIN = re.compile(r"\b(?:genshin|teyvat)\b", re.I)
HSR = re.compile(r"\b(?:honkai\s*[:\-]?\s*star\s*rail|star\s*rail|HSR|astral\s*express)\b", re.I)
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
        if GENSHIN.search(words):
            return "genshin", "Genshin Impact"
        if HSR.search(words):
            return "hsr", "Honkai: Star Rail"
        for pattern, game in OTHERS:
            if pattern.search(words):
                return "other", game
    return "other", "Other Worlds"


def playlist_category(title):
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
    details = get_video_details(key, all_ids)
    if not details:
        raise RuntimeError("No public/unlisted video details returned; old catalogue preserved")

    videos = {}
    for video_id in all_ids:
        if video_id not in details:
            continue
        snippet = details[video_id].get("snippet", {})
        previous = prior.get(video_id, {})
        cat, game = category(snippet)
        videos[video_id] = {
            "id": video_id,
            "title": snippet.get("title", "Untitled AMV"),
            "game": game,
            "category": cat,
            "year": snippet.get("publishedAt", "")[:4],
            "tag": previous.get("tag", "From YouTube playlist"),
            "featured": bool(previous.get("featured", False)),
            "publishedAt": snippet.get("publishedAt", "")
        }

    # Preserve explicitly handpicked featured videos if removed from a playlist.
    for video_id, previous in prior.items():
        if previous.get("featured") and video_id not in videos:
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
    # Avoid rewriting each 6 hours if actual playlist content has not changed.
    if ordered == existing.get("videos", []) and output_playlists == existing.get("playlists", []):
        print("Playlist catalogue unchanged: %d playlists, %d unique videos" % (len(output_playlists), len(ordered)))
        return
    data = {
        "updatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": "youtube-playlists",
        "playlists": output_playlists,
        "videos": ordered,
    }
    OUTPUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Synchronized %d complete playlists (%d unique videos, %d playlist entries)" % (
        len(output_playlists), len(ordered), sum(len(p["videoIds"]) for p in output_playlists)))


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, ValueError, KeyError, OSError) as error:
        print("Sync unsuccessful: " + str(error), file=sys.stderr)
        sys.exit(1)

#!/usr/bin/env python3
"""Synchronize public music edits from the channel into static videos.json.

Requires YOUTUBE_API_KEY as a GitHub Actions secret. No API key reaches browsers.
"""
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen
from urllib.error import HTTPError, URLError

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "videos.json"
API = "https://www.googleapis.com/youtube/v3"
HANDLE = os.getenv("YOUTUBE_HANDLE", "@BlazingFlamesStudio")
PLAYLIST = os.getenv("YOUTUBE_AMV_PLAYLIST_ID", "").strip()
LIMIT = max(50, min(5000, int(os.getenv("YOUTUBE_SCAN_LIMIT", "1500"))))
MIN_SECONDS = max(0, int(os.getenv("YOUTUBE_MIN_SECONDS", "60")))
ID = re.compile(r"^[A-Za-z0-9_-]{11}$")
MARKER = re.compile(r"\b(?:AMV|GMV|MMV|MAD|MV)\b|\bmusic\s*video\b", re.I)
EXCLUDE = re.compile(r"\b(?:livestream|live\s*stream|VOD|reaction|tutorial|guide|gameplay|walkthrough|patch\s*notes|account\s*review)\b", re.I)
GENSHIN = re.compile(r"\b(?:genshin|teyvat)\b", re.I)
HSR = re.compile(r"\b(?:honkai\s*[:\-]?\s*star\s*rail|star\s*rail|HSR|astral\s*express)\b", re.I)
OTHERS = [
    (re.compile(r"\b(?:wuthering\s*waves|wuwa)\b", re.I), "Wuthering Waves"),
    (re.compile(r"\b(?:zenless\s*zone\s*zero|zenless|ZZZ)\b", re.I), "Zenless Zone Zero"),
    (re.compile(r"\b(?:arknights\s*[:\-]?\s*endfield|endfield)\b", re.I), "Arknights: Endfield"),
    (re.compile(r"\b(?:honkai\s*impact\s*3(?:rd)?|HI3)\b", re.I), "Honkai Impact 3rd"),
]

def api_get(key, route, **kwargs):
    url = API + "/" + route + "?" + urlencode(dict(kwargs, key=key))
    try:
        with urlopen(url, timeout=30) as response:
            return json.load(response)
    except HTTPError as error:
        # Never print URLs, as they contain the secret key.
        raise RuntimeError("YouTube API failed with HTTP " + str(error.code)) from None
    except (URLError, TimeoutError):
        raise RuntimeError("YouTube API connection failed") from None

def get_playlist(key):
    if PLAYLIST:
        return PLAYLIST
    params = {"part": "contentDetails"}
    if HANDLE.startswith("UC") and len(HANDLE) == 24:
        params["id"] = HANDLE
    else:
        params["forHandle"] = HANDLE
    channels = api_get(key, "channels", **params).get("items", [])
    if not channels:
        raise RuntimeError("YouTube channel not found; check YOUTUBE_HANDLE")
    return channels[0]["contentDetails"]["relatedPlaylists"]["uploads"]

def get_ids(key, playlist):
    ids, token = [], None
    while len(ids) < LIMIT:
        params = {"part": "contentDetails", "playlistId": playlist, "maxResults": min(50, LIMIT-len(ids))}
        if token:
            params["pageToken"] = token
        page = api_get(key, "playlistItems", **params)
        for item in page.get("items", []):
            video_id = item.get("contentDetails", {}).get("videoId", "")
            if ID.fullmatch(video_id) and video_id not in ids:
                ids.append(video_id)
        token = page.get("nextPageToken")
        if not token:
            break
    return ids

def get_details(key, ids):
    result = {}
    for offset in range(0, len(ids), 50):
        page = api_get(key, "videos", part="snippet,contentDetails,status", id=",".join(ids[offset:offset+50]))
        result.update({item["id"]: item for item in page.get("items", [])})
    return result

def duration_seconds(value):
    match = re.fullmatch(r"P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", value or "")
    if not match:
        return 0
    d,h,m,s = (int(x or 0) for x in match.groups())
    return 86400*d+3600*h+60*m+s

def is_amv(item):
    snippet = item.get("snippet", {})
    title = snippet.get("title", "")
    tags = snippet.get("tags", [])
    return (item.get("status", {}).get("privacyStatus") == "public"
            and duration_seconds(item.get("contentDetails", {}).get("duration")) >= MIN_SECONDS
            and not EXCLUDE.search(title)
            and (bool(PLAYLIST) or bool(MARKER.search(title)) or any(MARKER.search(t) for t in tags)))

def category(snippet):
    for words in (snippet.get("title", ""), " ".join(snippet.get("tags", [])), snippet.get("description", "")[:250]):
        if GENSHIN.search(words):
            return "genshin", "Genshin Impact"
        if HSR.search(words):
            return "hsr", "Honkai: Star Rail"
        for regex, game in OTHERS:
            if regex.search(words):
                return "other", game
    return "other", "Other Worlds"

def main():
    key = os.getenv("YOUTUBE_API_KEY", "").strip()
    if not key:
        raise RuntimeError("Missing YOUTUBE_API_KEY: add as repository Actions secret")
    old_data = json.loads(OUTPUT.read_text(encoding="utf-8")) if OUTPUT.exists() else {"videos": []}
    old = {item["id"]: item for item in old_data.get("videos", [])
           if isinstance(item, dict) and ID.fullmatch(item.get("id", ""))}
    ids = get_ids(key, get_playlist(key))
    if not ids:
        raise RuntimeError("No uploads returned; existing catalog kept")
    details = get_details(key, ids)
    if not details:
        raise RuntimeError("No public video metadata returned; existing catalog kept")
    merged = dict(old)
    for video_id in ids:
        item = details.get(video_id)
        if not item or not is_amv(item):
            continue
        snippet = item.get("snippet", {})
        cat, game = category(snippet)
        previous = old.get(video_id, {})
        new = {
            "id": video_id, "title": snippet.get("title", "Untitled AMV"),
            "game": game, "category": cat,
            "year": snippet.get("publishedAt", "")[:4],
            "tag": previous.get("tag", "New release"),
            "featured": bool(previous.get("featured", False)),
            "publishedAt": snippet.get("publishedAt", "")
        }
        if new["featured"]:
            new["category"] = previous.get("category", cat)
            new["game"] = previous.get("game", game)
        merged[video_id] = new
    ordered = sorted(merged.values(), key=lambda v: (v.get("publishedAt", ""),v.get("year",""),v["id"]), reverse=True)
    if ordered == old_data.get("videos", []):
        print("Catalog unchanged: " + str(len(ordered)) + " videos")
        return
    data = {"updatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"), "videos": ordered}
    OUTPUT.write_text(json.dumps(data, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print("Catalog updated: " + str(len(ordered)) + " videos")

if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, ValueError, KeyError, OSError) as exc:
        print("Sync unsuccessful: " + str(exc), file=sys.stderr)
        sys.exit(1)

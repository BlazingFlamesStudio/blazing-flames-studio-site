"""No-network regression tests for the Blazing Flames catalog sync."""
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import sync_youtube as sync

CHANNEL = "UC" + "0" * 22
OTHER = "UC" + "9" * 22
UPLOADS = "UU" + "0" * 22
A, B, C, D = "AAAAAAAAAAA", "BBBBBBBBBBB", "CCCCCCCCCCC", "DDDDDDDDDDD"


def video(video_id, title, date, owner=CHANNEL):
    return {
        "id": video_id,
        "snippet": {
            "title": title, "description": "", "tags": [],
            "publishedAt": date, "channelId": owner,
        },
        "status": {"privacyStatus": "public"},
    }


class TitleTests(unittest.TestCase):
    def test_amv_markers(self):
        for title in ("PAYPHONE | AMV/GMV", "Star RailAMV/GMV",
                      "FOREVER COUNTRY [[AMVGMV]]", "ANOTHER AMV"):
            with self.subTest(title=title):
                self.assertTrue(sync.AMV_UPLOAD_TITLE.search(title))
        for title in ("IsshinAMV is... JehtMains?", "Livestream tonight"):
            with self.subTest(title=title):
                self.assertFalse(sync.AMV_UPLOAD_TITLE.search(title))


class UploadScanTests(unittest.TestCase):
    def test_paginates_and_deduplicates(self):
        def fake_api(key, route, **kw):
            if route == "channels" and kw.get("part") == "id":
                return {"items": [{"id": CHANNEL}]}
            if route == "channels" and kw.get("part") == "contentDetails":
                return {"items": [{
                    "contentDetails": {"relatedPlaylists": {"uploads": UPLOADS}}
                }]}
            if route == "playlistItems" and "pageToken" not in kw:
                return {"items": [
                    {"contentDetails": {"videoId": A}, "snippet": {"title": "FIRST | AMV"}},
                    {"contentDetails": {"videoId": B}, "snippet": {"title": "Gaming vlog"}}
                ], "nextPageToken": "next"}
            if route == "playlistItems" and kw.get("pageToken") == "next":
                return {"items": [
                    {"contentDetails": {"videoId": A}, "snippet": {"title": "FIRST | AMV"}},
                    {"contentDetails": {"videoId": C}, "snippet": {"title": "RAILAMV/GMV"}}
                ]}
            raise AssertionError((route, kw))
        with patch.object(sync, "api_get", side_effect=fake_api):
            self.assertEqual(sync.channel_upload_amv_ids("secret"), [A, C])

    def test_empty_scan_raises(self):
        with patch.object(sync, "channel_id", return_value=CHANNEL), \
                patch.object(sync, "api_get") as api:
            api.side_effect = [
                {"items": [{"contentDetails": {"relatedPlaylists": {"uploads": UPLOADS}}}]},
                {"items": []}
            ]
            with self.assertRaises(RuntimeError):
                sync.channel_upload_amv_ids("secret")


class CatalogSafetyTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.catalog = Path(self.tmp.name) / "videos.json"
        self.health = Path(self.tmp.name) / "catalog-health.json"
        self.recovery = Path(self.tmp.name) / "recovery.json"
        self.catalog.write_text('{"videos":[{"id":"AAAAAAAAAAA","featured":false}]}',
                                encoding="utf-8")
        self.original = self.catalog.read_bytes()
        self.patches = [
            patch.object(sync, "OUTPUT", self.catalog),
            patch.object(sync, "HEALTH_OUTPUT", self.health),
            patch.object(sync, "RECOVERY", self.recovery),
            patch.dict(os.environ, {"YOUTUBE_API_KEY": "unit-test"}),
            patch.object(sync, "channel_id", return_value=CHANNEL),
            patch.object(sync, "playlist_metadata", return_value=[
                {"id": "PL" + "Z" * 22, "snippet": {
                    "title": "Honkai: Star Rail AMVs", "description": ""
                }}
            ]),
            patch.object(sync, "playlist_video_ids", return_value=[A, B]),
        ]
        for p in self.patches:
            p.start()
            self.addCleanup(p.stop)

    def test_scan_failure_does_not_overwrite_catalog(self):
        with patch.object(sync, "channel_upload_amv_ids",
                          side_effect=RuntimeError("YouTube rate limit")):
            with self.assertRaises(RuntimeError):
                sync.main()
        self.assertEqual(self.catalog.read_bytes(), self.original)
        self.assertFalse(self.health.exists())

    def test_missing_video_details_do_not_erase_catalog(self):
        with patch.object(sync, "channel_upload_amv_ids", return_value=[A, C]), \
                patch.object(sync, "get_video_details", return_value={
                    A: video(A, "FIRST | AMV", "2026-01-01T00:00:00Z")
                }):
            with self.assertRaisesRegex(RuntimeError, "incomplete"):
                sync.main()
        self.assertEqual(self.catalog.read_bytes(), self.original)
        self.assertFalse(self.health.exists())


    def test_historical_amv_is_revalidated_and_kept_if_accessible(self):
        """YouTube uploads pagination may skip older but still-public videos."""
        self.recovery.write_text(json.dumps({"videoIds": [D]}), encoding="utf-8")
        details = {
            A: video(A, "FIRST | Honkai: Star Rail AMV", "2026-10-01T00:00:00Z"),
            B: video(B, "An unrelated creator reaction", "2026-09-01T00:00:00Z", OTHER),
            C: video(C, "NEW | Honkai: Star Rail AMV/GMV", "2026-11-23T04:30:00Z"),
            D: video(D, "OLDER | Genshin Impact AMV/GMV", "2023-07-05T03:00:00Z"),
        }
        with patch.object(sync, "channel_upload_amv_ids", return_value=[A, C]), \
                patch.object(sync, "get_video_details", return_value=details):
            sync.main()
        catalog = json.loads(self.catalog.read_text(encoding="utf-8"))
        health = json.loads(self.health.read_text(encoding="utf-8"))
        self.assertIn(D, [v["id"] for v in catalog["videos"]])
        self.assertEqual(health["channelAMVsVerified"], 3)
        self.assertEqual(health["historicAMVsRevalidated"], 1)
        self.assertEqual(health["channelAMVsOutsidePlaylists"], 2)
        self.assertEqual(health["channelAMVsPresentInUploadsFeed"], 2)

    def test_full_scan_keeps_playlists_and_tracks_ownership(self):
        details = {
            A: video(A, "FIRST | Honkai: Star Rail AMV", "2026-10-01T00:00:00Z"),
            B: video(B, "Another creator reaction", "2026-09-01T00:00:00Z", OTHER),
            C: video(C, "NEW | Honkai: Star Rail AMV/GMV", "2026-11-23T04:30:00Z"),
        }
        with patch.object(sync, "channel_upload_amv_ids", return_value=[A, C]), \
                patch.object(sync, "get_video_details", return_value=details):
            sync.main()
        catalog = json.loads(self.catalog.read_text(encoding="utf-8"))
        health = json.loads(self.health.read_text(encoding="utf-8"))
        self.assertEqual(len(catalog["videos"]), 3)
        self.assertEqual(catalog["source"], "youtube-playlists-and-channel-amvs")
        self.assertEqual(catalog["playlists"][0]["videoIds"], [A, B])
        self.assertEqual(catalog["videos"][0]["id"], C)
        self.assertEqual({v["id"]: v["channelOwned"] for v in catalog["videos"]},
                         {A: True, B: False, C: True})
        self.assertEqual(health["catalogVideos"], 3)
        self.assertEqual(health["amvTitleMatches"], 2)
        self.assertEqual(health["channelAMVsVerified"], 2)
        self.assertEqual(health["channelAMVsOutsidePlaylists"], 1)
        self.assertEqual(health["latestChannelAMV"]["id"], C)
        self.assertEqual(health["status"], "ok")


if __name__ == "__main__":
    unittest.main()

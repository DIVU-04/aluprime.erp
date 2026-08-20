import csv
import io
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

import leadfinder.app as lead_app


class LeadFinderApiTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        lead_app.DB_PATH = Path(self.temp_dir.name) / "test.db"
        self.client_context = TestClient(lead_app.app)
        self.client = self.client_context.__enter__()

    def tearDown(self):
        self.client_context.__exit__(None, None, None)
        self.temp_dir.cleanup()

    def demo_search(self):
        return self.client.post(
            "/api/search",
            json={
                "queries": ["dental clinics"],
                "locations": ["Ahmedabad, Gujarat"],
                "max_results_per_search": 20,
                "min_rating": 0,
                "min_reviews": 0,
                "require_phone": False,
                "require_website": False,
                "exclude_keywords": [],
                "demo": True,
            },
        )

    def test_health_and_config(self):
        self.assertEqual(self.client.get("/api/health").json(), {"status": "ok"})
        config = self.client.get("/api/config").json()
        self.assertIn("service_groups", config)
        self.assertEqual(config["data_source"], "Google Places API (New)")

    def test_demo_search_deduplicates_and_lists_full_details(self):
        response = self.demo_search()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["discovered"], 3)
        self.assertTrue(response.json()["demo"])

        repeated = self.demo_search()
        self.assertEqual(repeated.status_code, 200)

        payload = self.client.get("/api/leads").json()
        self.assertEqual(payload["total"], 3)
        self.assertEqual(payload["stats"]["with_phone"], 2)
        self.assertEqual(len(payload["items"]), 3)
        first = payload["items"][0]
        self.assertIn("opening_hours", first)
        self.assertIn("opportunities", first)
        self.assertIn("place_id", first)

    def test_search_filters_demo_results(self):
        response = self.client.post(
            "/api/search",
            json={
                "queries": ["professional services"],
                "locations": ["Ahmedabad"],
                "min_rating": 4.5,
                "min_reviews": 100,
                "require_phone": True,
                "require_website": True,
                "exclude_keywords": [],
                "demo": True,
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["discovered"], 1)
        payload = self.client.get("/api/leads").json()
        self.assertEqual(payload["items"][0]["name"], "Chandra Dental & Implant Clinic")

    def test_requires_api_key_outside_demo_mode(self):
        old_key = lead_app.PLACES_API_KEY
        lead_app.PLACES_API_KEY = ""
        try:
            response = self.client.post(
                "/api/search",
                json={
                    "queries": ["law firms"],
                    "locations": ["Ahmedabad"],
                    "demo": False,
                },
            )
        finally:
            lead_app.PLACES_API_KEY = old_key
        self.assertEqual(response.status_code, 400)
        self.assertIn("GOOGLE_MAPS_API_KEY", response.json()["detail"])

    def test_updates_status_notes_and_exports_csv(self):
        self.demo_search()
        place_id = self.client.get("/api/leads").json()["items"][0]["place_id"]
        response = self.client.patch(
            f"/api/leads/{place_id}",
            json={"status": "qualified", "notes": "Needs managed backup"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "qualified")
        self.assertEqual(response.json()["notes"], "Needs managed backup")

        filtered = self.client.get("/api/leads?status=qualified").json()
        self.assertEqual(filtered["total"], 1)

        export = self.client.get("/api/export.csv?status=qualified")
        self.assertEqual(export.status_code, 200)
        rows = list(csv.DictReader(io.StringIO(export.text)))
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["notes"], "Needs managed backup")
        self.assertIn("place_id", rows[0])

    def test_combination_limit_prevents_accidental_cost(self):
        response = self.client.post(
            "/api/search",
            json={
                "queries": [f"service {index}" for index in range(3)],
                "locations": [f"city {index}" for index in range(14)],
                "demo": True,
            },
        )
        self.assertEqual(response.status_code, 422)
        self.assertIn("40", response.json()["detail"])


if __name__ == "__main__":
    unittest.main()

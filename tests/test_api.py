"""
tests/test_api.py — Integration Tests for Auth and Logs
"""

import json
import pytest


# Helper to get authorization headers
def get_auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ── Authentication Tests ──────────────────────────────────────────────────────
class TestAuthentication:
    def test_register_user(self, client):
        r = client.post("/api/auth/register", json={
            "email": "test-user@wellness.com",
            "password": "securepassword123",
            "due_date": "2025-12-01"
        })
        assert r.status_code == 201
        data = r.get_json()
        assert "token" in data
        assert data["user"]["email"] == "test-user@wellness.com"
        assert data["user"]["due_date"] == "2025-12-01"

    def test_register_duplicate_email(self, client):
        r = client.post("/api/auth/register", json={
            "email": "test-user@wellness.com",
            "password": "differentpassword"
        })
        assert r.status_code == 409
        assert "Email already registered" in r.get_json()["error"]

    def test_register_invalid_email(self, client):
        r = client.post("/api/auth/register", json={
            "email": "invalidemail",
            "password": "securepassword123"
        })
        assert r.status_code == 400

    def test_register_short_password(self, client):
        r = client.post("/api/auth/register", json={
            "email": "another@wellness.com",
            "password": "123"
        })
        assert r.status_code == 400

    def test_login_success(self, client):
        r = client.post("/api/auth/login", json={
            "email": "test-user@wellness.com",
            "password": "securepassword123"
        })
        assert r.status_code == 200
        data = r.get_json()
        assert "token" in data
        assert data["user"]["email"] == "test-user@wellness.com"

    def test_login_invalid_password(self, client):
        r = client.post("/api/auth/login", json={
            "email": "test-user@wellness.com",
            "password": "wrongpassword"
        })
        assert r.status_code == 401

    def test_login_missing_fields(self, client):
        r = client.post("/api/auth/login", json={
            "email": "test-user@wellness.com"
        })
        assert r.status_code == 400


# ── Daily Logs Tests ──────────────────────────────────────────────────────────
class TestDailyLogs:
    # We will register a fresh user to test log operations
    @pytest.fixture(autouse=True)
    def setup_user(self, client):
        import uuid
        email = f"loguser_{uuid.uuid4().hex[:8]}@wellness.com"
        r = client.post("/api/auth/register", json={
            "email": email,
            "password": "password123"
        })
        assert r.status_code == 201
        self.token = r.get_json()["token"]

    def test_create_log_unauthorized(self, client):
        r = client.post("/api/logs", json={
            "sleep_hours":      7.5,
            "water_liters":     2.1,
            "symptom_score":    2,
            "mood_score":       2,
        })
        assert r.status_code == 401

    def test_create_log_invalid_token(self, client):
        r = client.post("/api/logs", 
                        headers=get_auth_headers("invalid-token-12345"),
                        json={
                            "sleep_hours":      7.5,
                            "water_liters":     2.1,
                            "symptom_score":    2,
                            "mood_score":       2,
                        })
        assert r.status_code == 401

    def test_create_log_success(self, client):
        r = client.post("/api/logs", 
                        headers=get_auth_headers(self.token),
                        json={
                            "sleep_hours":      7.5,
                            "water_liters":     2.1,
                            "symptom_score":    2,
                            "mood_score":       2,
                            "log_date":         "2025-06-01",
                        })
        assert r.status_code == 201
        data = r.get_json()
        assert data["log"]["sleep_hours"] == 7.5
        assert data["log"]["mood_score"] == 2

    def test_multiple_logs_per_day_allowed(self, client):
        """
        A second check-in on the same (user, date) must succeed.

        The old uq_user_date unique constraint was dropped deliberately: a
        postpartum day can swing between morning and night, and collapsing
        that into one row per day threw away the swing. This test replaces
        test_duplicate_log_rejected, which asserted the constraint that no
        longer exists.
        """
        day = "2025-06-02"

        morning = client.post("/api/logs",
                              headers=get_auth_headers(self.token),
                              json={
                                  "sleep_hours":      7.5,
                                  "water_liters":     2.1,
                                  "symptom_score":    2,
                                  "mood_score":       2,
                                  "log_date":         day,
                              })
        assert morning.status_code == 201

        evening = client.post("/api/logs",
                              headers=get_auth_headers(self.token),
                              json={
                                  "sleep_hours":      8.0,
                                  "water_liters":     2.5,
                                  "symptom_score":    1,
                                  "mood_score":       1,
                                  "log_date":         day,
                              })
        assert evening.status_code == 201

        morning_log = morning.get_json()["log"]
        evening_log = evening.get_json()["log"]
        assert morning_log["id"] != evening_log["id"]

        # The 201s alone would also pass if the second insert were silently
        # dropped or overwrote the first, so read it back: both rows must be
        # in the database, each keeping its own values.
        history = client.get("/api/logs/history",
                             headers=get_auth_headers(self.token)).get_json()
        same_day = [log for log in history["logs"] if log["log_date"] == day]
        assert len(same_day) == 2

        by_id = {log["id"]: log for log in same_day}
        assert by_id[morning_log["id"]]["mood_score"] == 2
        assert by_id[morning_log["id"]]["sleep_hours"] == 7.5
        assert by_id[evening_log["id"]]["mood_score"] == 1
        assert by_id[evening_log["id"]]["sleep_hours"] == 8.0

    def test_log_invalid_mood_score(self, client):
        r = client.post("/api/logs", 
                        headers=get_auth_headers(self.token),
                        json={
                            "sleep_hours":      7.0,
                            "water_liters":     2.0,
                            "symptom_score":    2,
                            "mood_score":       9,   # invalid: must be 1-5
                        })
        assert r.status_code == 400

    def test_get_history(self, client):
        # Seed a log first
        client.post("/api/logs", 
                    headers=get_auth_headers(self.token),
                    json={
                        "sleep_hours":      7.5,
                        "water_liters":     2.1,
                        "symptom_score":    2,
                        "mood_score":       2,
                        "log_date":         "2025-06-03",
                    })
        r = client.get("/api/logs/history", headers=get_auth_headers(self.token))
        assert r.status_code == 200
        data = r.get_json()
        assert isinstance(data["logs"], list)
        assert len(data["logs"]) >= 1

    def test_get_history_unauthorized(self, client):
        r = client.get("/api/logs/history")
        assert r.status_code == 401


# ── Health ────────────────────────────────────────────────────────────────────
# The former TestMLMetrics class covered /api/ml/health and /api/ml/metrics.
# Both endpoints were removed with the legacy well-being index (decisions #1,
# #8). test_root_health is unrelated to ML and is kept.
class TestHealth:
    def test_root_health(self, client):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.get_json()["status"] == "ok"

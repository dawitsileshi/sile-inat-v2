"""
tests/test_forum_chatbot.py — Forum and Chatbot API tests
"""

import uuid


def client_headers():
    return {"X-Anonymous-Client-Id": str(uuid.uuid4())}


class TestForum:
    def test_create_and_list_posts(self, client):
        headers = client_headers()
        r = client.post(
            "/api/forum/posts",
            json={
                "title": "Sleep tips?",
                "content": "My newborn wakes every hour.",
                "category": "Sleep",
            },
            headers=headers,
        )
        assert r.status_code == 201
        post = r.get_json()["post"]
        assert post["title"] == "Sleep tips?"
        assert post["author_label"] == "You"

        r2 = client.get("/api/forum/posts?category=Sleep", headers=headers)
        assert r2.status_code == 200
        data = r2.get_json()
        assert data["count"] >= 1
        assert any(p["title"] == "Sleep tips?" for p in data["posts"])

    def test_create_post_requires_client_id(self, client):
        r = client.post(
            "/api/forum/posts",
            json={"title": "Hi", "content": "Hello", "category": "General"},
        )
        assert r.status_code == 400

    def test_get_post_with_replies(self, client):
        headers = client_headers()
        r = client.post(
            "/api/forum/posts",
            json={
                "title": "Breastfeeding question",
                "content": "Is latch pain normal?",
                "category": "Breastfeeding",
            },
            headers=headers,
        )
        post_id = r.get_json()["post"]["id"]

        r2 = client.post(
            f"/api/forum/posts/{post_id}/replies",
            json={"content": "It can be normal at first — ask a lactation consultant."},
            headers=headers,
        )
        assert r2.status_code == 201
        assert len(r2.get_json()["post"]["replies"]) == 1

        r3 = client.get(f"/api/forum/posts/{post_id}", headers=headers)
        assert r3.status_code == 200
        assert r3.get_json()["post"]["reply_count"] == 1


class TestChatbot:
    def test_chatbot_requires_message(self, client):
        r = client.post("/api/chatbot", json={}, headers=client_headers())
        assert r.status_code == 400

    def test_chatbot_returns_reply_without_api_key(self, client):
        r = client.post(
            "/api/chatbot",
            json={"message": "I feel overwhelmed as a new mom."},
            headers=client_headers(),
        )
        assert r.status_code == 200
        data = r.get_json()
        assert "reply" in data
        assert len(data["reply"]) > 10

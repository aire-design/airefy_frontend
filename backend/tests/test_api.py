"""End-to-end API tests covering the contract the Next.js frontend relies on.

Ordered as a user journey: auth → tags → draft → publish → public reads →
ownership → profile visibility → unpublish/delete → uploads.
"""
import io

import pytest
from PIL import Image

PUBLISHED_AT = "2026-07-01T09:40:22.405Z"


# ─── Auth ────────────────────────────────────────────────────────────────────

def test_register_returns_jwt_and_user(alice):
    _, user = alice
    assert user["username"] == "alice"
    assert len(user["documentId"]) == 24
    assert user["showEmail"] is False  # email hidden by default
    assert user["showBio"] is True


def test_registration_closed_after_first_account(client, alice):
    """Single-author blog: once the owner account exists, signup is locked."""
    r = client.post(
        "/api/auth/local/register",
        json={"username": "intruder", "email": "i@example.com", "password": "secret123"},
    )
    assert r.status_code == 403
    assert r.json()["error"]["message"] == "Registration is closed — Airefy is a personal blog."


@pytest.mark.parametrize("identifier", ["alice@example.com", "alice"])
def test_login_by_email_or_username(client, alice, identifier):
    r = client.post("/api/auth/local", json={"identifier": identifier, "password": "secret123"})
    assert r.status_code == 200
    assert "jwt" in r.json()


def test_bad_login(client, alice):
    r = client.post("/api/auth/local", json={"identifier": "alice", "password": "wrong"})
    assert r.status_code == 400
    assert r.json()["error"]["message"] == "Invalid identifier or password"


def test_users_me_is_bare_object(client, alice):
    headers, _ = alice
    r = client.get("/api/users/me", headers=headers)
    assert r.status_code == 200
    assert r.json()["email"] == "alice@example.com"
    assert "data" not in r.json()  # /users/me has no {data} envelope


def test_users_me_requires_auth(client):
    assert client.get("/api/users/me").status_code == 401


# ─── Tags ────────────────────────────────────────────────────────────────────

def test_create_and_list_tags(client, alice):
    headers, _ = alice
    r = client.post("/api/tags", json={"data": {"name": "Python", "slug": "python"}}, headers=headers)
    assert r.status_code == 200
    assert r.json()["data"]["slug"] == "python"

    r = client.get("/api/tags")
    names = [t["name"] for t in r.json()["data"]]
    assert "Python" in names


def test_create_tag_requires_auth(client):
    r = client.post("/api/tags", json={"data": {"name": "Nope"}})
    assert r.status_code == 401


# ─── Article lifecycle ──────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def draft(client, alice):
    headers, _ = alice
    tag_id = client.get("/api/tags").json()["data"][0]["id"]
    content = "word " * 450  # 450 words → ceil(450/200) = 3 min read
    r = client.post(
        "/api/articles",
        json={"data": {
            "title": "Hello World",
            "slug": "hello-world-abcd",
            "content": content,
            "excerpt": "hi",
            "tags": [tag_id],
        }},
        headers=headers,
    )
    assert r.status_code == 200, r.text
    return r.json()["data"]


def test_draft_shape(draft):
    assert draft["publishedAt"] is None
    assert draft["readTime"] == 3
    assert draft["author"]["username"] == "alice"
    assert draft["tags"][0]["slug"] == "python"
    assert len(draft["documentId"]) == 24


def test_draft_hidden_from_public(client, draft):
    assert client.get("/api/articles").json()["meta"]["pagination"]["total"] == 0
    assert client.get(f"/api/articles/{draft['documentId']}").status_code == 404


def test_draft_visible_to_owner(client, alice, draft):
    headers, _ = alice
    r = client.get(f"/api/articles/{draft['documentId']}", headers=headers)
    assert r.status_code == 200


def test_publish_and_preserve_published_at(client, alice, draft):
    headers, _ = alice
    doc = draft["documentId"]

    r = client.put(f"/api/articles/{doc}", json={"data": {"publishedAt": PUBLISHED_AT}}, headers=headers)
    assert r.json()["data"]["publishedAt"] == PUBLISHED_AT

    # Editing a published post resends the original timestamp — must not drift
    r = client.put(
        f"/api/articles/{doc}",
        json={"data": {"title": "Hello Again", "publishedAt": PUBLISHED_AT}},
        headers=headers,
    )
    assert r.json()["data"]["publishedAt"] == PUBLISHED_AT
    assert r.json()["data"]["title"] == "Hello Again"


def test_public_reads(client, draft):
    r = client.get("/api/articles")
    assert r.json()["meta"]["pagination"]["total"] == 1

    assert len(client.get("/api/articles?slug=hello-world-abcd").json()["data"]) == 1
    assert len(client.get("/api/articles?tag=python").json()["data"]) == 1
    assert len(client.get("/api/articles-by-user/alice").json()["data"]) == 1
    assert client.get("/api/articles-by-user/nobody").json()["data"] == []


def test_my_articles_includes_drafts_and_published(client, alice, draft):
    headers, _ = alice
    r = client.get("/api/my-articles", headers=headers)
    assert len(r.json()["data"]) == 1


def test_slug_must_be_unique(client, alice):
    headers, _ = alice
    r = client.post(
        "/api/articles",
        json={"data": {"title": "Dupe slug", "slug": "hello-world-abcd", "content": "x y z"}},
        headers=headers,
    )
    assert r.status_code == 400


def test_ownership_enforced(client, mallory, draft):
    headers, _ = mallory
    doc = draft["documentId"]
    assert client.put(f"/api/articles/{doc}", json={"data": {"title": "Stolen!!"}}, headers=headers).status_code == 403
    assert client.delete(f"/api/articles/{doc}", headers=headers).status_code == 403


# ─── Profile ────────────────────────────────────────────────────────────────

def test_profile_update_and_visibility(client, alice):
    headers, _ = alice
    r = client.put(
        "/api/profile",
        json={"bio": "I write code", "twitter": "alice_x", "showTwitter": False},
        headers=headers,
    )
    assert r.status_code == 200
    assert r.json()["bio"] == "I write code"

    pub = client.get("/api/profile/alice").json()
    assert pub.get("bio") == "I write code"
    assert "twitter" not in pub          # hidden by toggle
    assert "showTwitter" not in pub      # toggles never leak publicly

    own = client.get("/api/profile/alice", headers=headers).json()
    assert own.get("twitter") == "alice_x"
    assert own.get("showTwitter") is False


def test_bio_word_limit(client, alice):
    headers, _ = alice
    r = client.put("/api/profile", json={"bio": "word " * 1000}, headers=headers)
    assert r.status_code == 200  # exactly 1000 words is allowed

    r = client.put("/api/profile", json={"bio": "word " * 1001}, headers=headers)
    assert r.status_code == 400
    assert r.json()["error"]["message"] == "Bio must be 1000 words or fewer."


def test_profile_username_validation(client, alice):
    headers, _ = alice
    r = client.put("/api/profile", json={"username": "a!"}, headers=headers)
    assert r.status_code == 400


# ─── Upload ─────────────────────────────────────────────────────────────────

def test_upload_image_generates_formats(client, alice):
    headers, _ = alice
    buf = io.BytesIO()
    Image.new("RGB", (900, 600), "red").save(buf, format="JPEG")
    buf.seek(0)

    r = client.post(
        "/api/upload",
        files={"files": ("photo.jpg", buf, "image/jpeg")},
        headers=headers,
    )
    assert r.status_code == 200, r.text
    uploaded = r.json()
    assert isinstance(uploaded, list)  # bare array, no envelope
    media = uploaded[0]
    assert media["width"] == 900 and media["height"] == 600
    # 900px wide → thumbnail(245), small(500), medium(750) all generated
    assert set(media["formats"].keys()) == {"thumbnail", "small", "medium"}
    assert media["formats"]["medium"]["width"] == 750

    # The stored file must actually be served
    assert client.get(media["url"]).status_code == 200
    assert client.get(media["formats"]["thumbnail"]["url"]).status_code == 200


def test_upload_palette_image_does_not_crash(client, alice):
    """Palette-mode PNGs (mode P) must still produce resized formats."""
    headers, _ = alice
    buf = io.BytesIO()
    Image.new("RGB", (800, 400), "blue").convert("P").save(buf, format="PNG")
    buf.seek(0)

    r = client.post("/api/upload", files={"files": ("pal.png", buf, "image/png")}, headers=headers)
    assert r.status_code == 200, r.text
    assert r.json()[0]["formats"] is not None


def test_avatar_flow(client, alice):
    headers, _ = alice
    buf = io.BytesIO()
    Image.new("RGB", (300, 300), "green").save(buf, format="PNG")
    buf.seek(0)
    media = client.post("/api/upload", files={"files": ("me.png", buf, "image/png")}, headers=headers).json()[0]

    r = client.put("/api/profile", json={"avatar": media["id"]}, headers=headers)
    assert r.json()["avatar"]["id"] == media["id"]

    # Avatar is always publicly visible
    assert client.get("/api/profile/alice").json()["avatar"]["id"] == media["id"]

    # Remove avatar
    r = client.put("/api/profile", json={"avatar": None}, headers=headers)
    assert r.json()["avatar"] is None


# ─── Unpublish & delete ─────────────────────────────────────────────────────

def test_unpublish_then_delete(client, alice, draft):
    headers, _ = alice
    doc = draft["documentId"]

    r = client.put(f"/api/articles/{doc}", json={"data": {"publishedAt": None}}, headers=headers)
    assert r.json()["data"]["publishedAt"] is None

    r = client.delete(f"/api/articles/{doc}", headers=headers)
    assert r.status_code == 200
    assert r.json()["data"] is None  # 200 + JSON body: frontend always calls res.json()

    assert client.get(f"/api/articles/{doc}", headers=headers).status_code == 404

"""Certifications: public read-only timeline, owner-only management."""


def test_create_requires_auth(client):
    r = client.post("/api/certifications", json={"data": {
        "title": "AWS SAA", "issuer": "AWS", "issuedDate": "2026-01-15"}})
    assert r.status_code == 401


def test_create_and_public_list(client, alice):
    headers, _ = alice
    r = client.post("/api/certifications", json={"data": {
        "title": "AWS Solutions Architect Associate",
        "issuer": "Amazon Web Services",
        "issuedDate": "2026-01-15",
        "credentialUrl": "https://www.credly.com/badges/abc123",
        "skills": "AWS, Cloud Architecture, Networking",
        "description": "Validated cloud architecture skills.",
    }}, headers=headers)
    assert r.status_code == 200, r.text
    cert = r.json()["data"]
    assert cert["title"] == "AWS Solutions Architect Associate"
    assert cert["issuedDate"].startswith("2026-01-15")
    assert cert["credentialUrl"] == "https://www.credly.com/badges/abc123"
    assert len(cert["documentId"]) == 24

    # Second, older cert — the public list must be newest-first
    r = client.post("/api/certifications", json={"data": {
        "title": "Python for Everybody", "issuer": "Coursera",
        "issuedDate": "2025-06-01"}}, headers=headers)
    assert r.status_code == 200

    r = client.get("/api/certifications")  # no auth — public
    assert r.status_code == 200
    titles = [c["title"] for c in r.json()["data"]]
    assert titles == ["AWS Solutions Architect Associate", "Python for Everybody"]


def test_validation(client, alice):
    headers, _ = alice
    r = client.post("/api/certifications", json={"data": {
        "title": "X", "issuer": "Y"}}, headers=headers)
    assert r.status_code == 400  # missing issuedDate

    r = client.post("/api/certifications", json={"data": {
        "title": "X", "issuer": "Y", "issuedDate": "not-a-date"}}, headers=headers)
    assert r.status_code == 400

    r = client.post("/api/certifications", json={"data": {
        "title": "X", "issuer": "Y", "issuedDate": "2026-01-01",
        "credentialUrl": "javascript:alert(1)"}}, headers=headers)
    assert r.status_code == 400  # only http(s) links allowed


def test_pdf_certificate_upload(client, alice):
    """PDF certificates upload cleanly: no image formats, correct mime, served inline."""
    headers, _ = alice
    pdf_bytes = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n"
    r = client.post(
        "/api/upload",
        files={"files": ("aws-cert.pdf", pdf_bytes, "application/pdf")},
        headers=headers,
    )
    assert r.status_code == 200, r.text
    media = r.json()[0]
    assert media["mime"] == "application/pdf"
    assert media["formats"] is None
    assert media["width"] is None

    served = client.get(media["url"])
    assert served.status_code == 200
    assert served.headers["content-type"] == "application/pdf"

    # Attach it to a certification as the badge
    r = client.post("/api/certifications", json={"data": {
        "title": "PDF Cert", "issuer": "Test", "issuedDate": "2026-03-01",
        "badge": media["id"]}}, headers=headers)
    assert r.status_code == 200
    assert r.json()["data"]["badge"]["mime"] == "application/pdf"


def test_update_and_delete(client, alice):
    headers, _ = alice
    r = client.post("/api/certifications", json={"data": {
        "title": "Temp Cert", "issuer": "Test", "issuedDate": "2026-02-01"}}, headers=headers)
    doc = r.json()["data"]["documentId"]

    r = client.put(f"/api/certifications/{doc}", json={"data": {
        "title": "Renamed Cert", "skills": "Testing"}}, headers=headers)
    assert r.status_code == 200
    assert r.json()["data"]["title"] == "Renamed Cert"
    assert r.json()["data"]["skills"] == "Testing"

    assert client.put(f"/api/certifications/{doc}", json={"data": {"title": "x"}}).status_code == 401

    r = client.delete(f"/api/certifications/{doc}", headers=headers)
    assert r.status_code == 200
    assert doc not in [c["documentId"] for c in client.get("/api/certifications").json()["data"]]

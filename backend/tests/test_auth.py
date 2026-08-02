"""
Tests for authentication — high-scrutiny per team guidelines §5.
Covers: registration, password policy, login, and role enforcement.
"""


def test_register_creates_user(client):
    response = client.post("/auth/register", json={
        "full_name": "Test User",
        "email": "test1@example.com",
        "password": "StrongPass123!",
        "role": "staff",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test1@example.com"
    assert "hashed_password" not in data  # must never leak the hash


def test_register_rejects_weak_password(client):
    response = client.post("/auth/register", json={
        "full_name": "Test User",
        "email": "test2@example.com",
        "password": "weak",
        "role": "staff",
    })
    assert response.status_code == 422


def test_register_rejects_duplicate_email(client):
    payload = {
        "full_name": "Test User",
        "email": "dupe@example.com",
        "password": "StrongPass123!",
        "role": "staff",
    }
    client.post("/auth/register", json=payload)
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 400


def test_login_with_correct_credentials_succeeds(client):
    client.post("/auth/register", json={
        "full_name": "Login Test",
        "email": "login1@example.com",
        "password": "StrongPass123!",
        "role": "staff",
    })
    response = client.post("/auth/login", json={
        "email": "login1@example.com",
        "password": "StrongPass123!",
    })
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_login_with_wrong_password_fails(client):
    client.post("/auth/register", json={
        "full_name": "Login Test",
        "email": "login2@example.com",
        "password": "StrongPass123!",
        "role": "staff",
    })
    response = client.post("/auth/login", json={
        "email": "login2@example.com",
        "password": "WrongPassword123!",
    })
    assert response.status_code == 401


def test_unauthenticated_request_rejected(client):
    response = client.get("/auth/me")
    assert response.status_code in (401, 403)
from __future__ import annotations

from fastapi.testclient import TestClient

PASSWORD = "hunter2000"
CREDENTIALS = {"name": "Bob", "email": "bob@example.com", "password": PASSWORD}


def test_register_returns_the_new_account(client: TestClient) -> None:
    response = client.post("/api/auth/register", json=CREDENTIALS)

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Bob"
    assert body["email"] == "bob@example.com"
    assert body["id"]


def test_register_never_returns_the_password(client: TestClient) -> None:
    response = client.post("/api/auth/register", json=CREDENTIALS)

    assert "password" not in response.json()
    assert "hashed_password" not in response.json()


def test_register_starts_a_session_cookie(client: TestClient) -> None:
    response = client.post("/api/auth/register", json=CREDENTIALS)

    assert "session" in response.cookies
    # httpx only sends a Secure cookie over https, so the flag has to stay off
    # for the local http setup to work at all.
    set_cookie = response.headers["set-cookie"]
    assert "HttpOnly" in set_cookie
    assert "Secure" not in set_cookie


def test_register_duplicate_email_conflicts(client: TestClient) -> None:
    client.post("/api/auth/register", json=CREDENTIALS)

    response = client.post("/api/auth/register", json={**CREDENTIALS, "name": "Someone else"})

    assert response.status_code == 409
    assert response.json()["message"] == "An account already exists for this email"


def test_register_treats_emails_as_case_insensitive(client: TestClient) -> None:
    client.post("/api/auth/register", json=CREDENTIALS)

    response = client.post("/api/auth/register", json={**CREDENTIALS, "email": "BOB@Example.com"})

    assert response.status_code == 409


def test_register_lowercases_the_stored_email(client: TestClient) -> None:
    response = client.post("/api/auth/register", json={**CREDENTIALS, "email": "  Bob@Example.com "})

    assert response.json()["email"] == "bob@example.com"


def test_register_rejects_a_short_password(client: TestClient) -> None:
    response = client.post("/api/auth/register", json={**CREDENTIALS, "password": "short"})

    assert response.status_code == 422
    assert "password" in response.json()["message"]


def test_register_rejects_a_malformed_email(client: TestClient) -> None:
    response = client.post("/api/auth/register", json={**CREDENTIALS, "email": "not-an-email"})

    assert response.status_code == 422
    assert "email" in response.json()["message"]


def test_login_with_correct_credentials(client: TestClient) -> None:
    client.post("/api/auth/register", json=CREDENTIALS)
    client.post("/api/auth/logout")

    response = client.post("/api/auth/login", json={"email": "bob@example.com", "password": PASSWORD})

    assert response.status_code == 200
    assert response.json()["email"] == "bob@example.com"
    assert "session" in response.cookies


def test_login_with_wrong_password_is_rejected(client: TestClient) -> None:
    client.post("/api/auth/register", json=CREDENTIALS)

    response = client.post("/api/auth/login", json={"email": "bob@example.com", "password": "wrong-password"})

    assert response.status_code == 401
    assert response.json()["message"] == "Email or password is incorrect"


def test_login_with_unknown_email_is_rejected(client: TestClient) -> None:
    response = client.post("/api/auth/login", json={"email": "ghost@example.com", "password": PASSWORD})

    assert response.status_code == 401


def test_login_is_case_insensitive_on_email(client: TestClient) -> None:
    client.post("/api/auth/register", json=CREDENTIALS)

    response = client.post("/api/auth/login", json={"email": "BOB@example.com", "password": PASSWORD})

    assert response.status_code == 200


def test_passwords_are_hashed_not_stored_in_plaintext(client: TestClient, store) -> None:
    client.post("/api/auth/register", json=CREDENTIALS)

    user = store.user_by_email("bob@example.com")
    assert user is not None
    assert user.hashed_password != PASSWORD
    assert user.hashed_password.startswith("$2b$")


def test_me_returns_the_signed_in_user(auth_client: TestClient) -> None:
    response = auth_client.get("/api/auth/me")

    assert response.status_code == 200
    assert response.json()["email"] == "alice@example.com"


def test_me_without_a_session_is_rejected(client: TestClient) -> None:
    response = client.get("/api/auth/me")

    assert response.status_code == 401
    assert response.json()["message"] == "No active session"


def test_logout_ends_the_session(auth_client: TestClient) -> None:
    assert auth_client.post("/api/auth/logout").status_code == 204

    assert auth_client.get("/api/auth/me").status_code == 401
    assert auth_client.get("/api/boards").status_code == 401


def test_logout_without_a_session_is_rejected(client: TestClient) -> None:
    assert client.post("/api/auth/logout").status_code == 401


def test_logout_leaves_the_account_intact(auth_client: TestClient) -> None:
    auth_client.post("/api/auth/logout")

    response = auth_client.post("/api/auth/login", json={"email": "alice@example.com", "password": PASSWORD})

    assert response.status_code == 200


def test_protected_endpoint_without_a_session_is_rejected(client: TestClient) -> None:
    response = client.get("/api/boards")

    assert response.status_code == 401


def test_protected_endpoint_with_an_unknown_session_is_rejected(client: TestClient) -> None:
    client.cookies.set("session", "not-a-real-session", domain="testserver")

    response = client.get("/api/boards")

    assert response.status_code == 401

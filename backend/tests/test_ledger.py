"""
Tests for ledger logic — high-scrutiny per team guidelines §5.
Verifies branch isolation and correct entry creation with real numbers.
"""


def _register_and_login_admin(client, email="admin@example.com"):
    client.post("/auth/register", json={
        "full_name": "Admin User",
        "email": email,
        "password": "StrongPass123!",
        "role": "admin",
    })
    response = client.post("/auth/login", json={"email": email, "password": "StrongPass123!"})
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _create_branch(client, headers, name="Test Branch"):
    response = client.post("/branches/", json={"name": name, "address": "Test Address"}, headers=headers)
    assert response.status_code == 201
    return response.json()["id"]


def test_sales_entry_requires_valid_branch(client):
    headers = _register_and_login_admin(client)
    fake_branch_id = "00000000-0000-0000-0000-000000000000"
    response = client.post("/ledgers/sales", json={
        "branch_id": fake_branch_id,
        "customer_id": None,
        "entry_type": "credit",
        "amount": "500",
        "description": "Should fail",
    }, headers=headers)
    assert response.status_code == 400  # now a clean error, not a raw 500 crash


def test_sales_entry_created_with_correct_amount(client):
    headers = _register_and_login_admin(client)
    branch_id = _create_branch(client, headers)

    response = client.post("/ledgers/sales", json={
        "branch_id": branch_id,
        "customer_id": None,
        "entry_type": "credit",
        "amount": "1250.50",
        "description": "Test sale",
    }, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["amount"] == "1250.50"
    assert data["entry_type"] == "credit"


def test_branch_isolation_in_ledger_filtering(client):
    headers = _register_and_login_admin(client)
    branch_a = _create_branch(client, headers, name="Branch A")
    branch_b = _create_branch(client, headers, name="Branch B")

    client.post("/ledgers/sales", json={
        "branch_id": branch_a, "customer_id": None, "entry_type": "credit",
        "amount": "500", "description": "Branch A sale",
    }, headers=headers)
    client.post("/ledgers/sales", json={
        "branch_id": branch_b, "customer_id": None, "entry_type": "credit",
        "amount": "750", "description": "Branch B sale",
    }, headers=headers)

    response_a = client.get(f"/ledgers/sales?branch_id={branch_a}", headers=headers)
    response_b = client.get(f"/ledgers/sales?branch_id={branch_b}", headers=headers)

    amounts_a = [entry["amount"] for entry in response_a.json()]
    amounts_b = [entry["amount"] for entry in response_b.json()]

    assert "500.00" in amounts_a or "500" in amounts_a
    assert "750.00" not in amounts_a and "750" not in amounts_a
    assert "750.00" in amounts_b or "750" in amounts_b
    assert "500.00" not in amounts_b and "500" not in amounts_b


def test_non_admin_cannot_create_party_entry(client):
    # Register a STAFF user (not admin/manager) — should be blocked from party ledger
    client.post("/auth/register", json={
        "full_name": "Staff User",
        "email": "staff@example.com",
        "password": "StrongPass123!",
        "role": "staff",
    })
    login = client.post("/auth/login", json={"email": "staff@example.com", "password": "StrongPass123!"})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    admin_headers = _register_and_login_admin(client, email="admin2@example.com")
    branch_id = _create_branch(client, admin_headers)

    party_response = client.post("/parties/", json={"name": "Test Supplier"}, headers=admin_headers)
    party_id = party_response.json()["id"]

    response = client.post("/ledgers/party", json={
        "branch_id": branch_id, "party_id": party_id, "entry_type": "debit",
        "amount": "1000", "description": "Should be forbidden",
    }, headers=headers)
    assert response.status_code == 403
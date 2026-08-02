"""
Real-number ledger verification scenarios — required by team guidelines §6
before merge. Each scenario's expected result was calculated by hand first,
then verified against the API's actual output.
"""
from decimal import Decimal


def _register_and_login_admin(client, email="ledgertest@example.com"):
    client.post("/auth/register", json={
        "full_name": "Ledger Test Admin",
        "email": email,
        "password": "StrongPass123!",
        "role": "admin",
    })
    response = client.post("/auth/login", json={"email": email, "password": "StrongPass123!"})
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_scenario_1_simple_sale(client):
    """Customer buys goods worth Rs. 1,850, paid in full. Ledger should record exactly 1850.00."""
    headers = _register_and_login_admin(client)
    branch = client.post("/branches/", json={"name": "Kathmandu Branch"}, headers=headers).json()

    response = client.post("/ledgers/sales", json={
        "branch_id": branch["id"],
        "customer_id": None,
        "entry_type": "credit",
        "amount": "1850.00",
        "description": "Scenario 1: simple full-payment sale",
    }, headers=headers)

    assert response.status_code == 201
    assert Decimal(response.json()["amount"]) == Decimal("1850.00")


def test_scenario_2_sale_with_discount_records_final_amount(client):
    """
    Bill is Rs. 3200 before a 10% owner's discount, applied upstream.
    Ledger must record the FINAL amount (2880.00), not the pre-discount amount.
    """
    headers = _register_and_login_admin(client, email="ledgertest2@example.com")
    branch = client.post("/branches/", json={"name": "Pokhara Branch"}, headers=headers).json()

    pre_discount = Decimal("3200.00")
    discount_rate = Decimal("0.10")
    expected_final = pre_discount * (1 - discount_rate)  # 2880.00

    response = client.post("/ledgers/sales", json={
        "branch_id": branch["id"],
        "customer_id": None,
        "entry_type": "credit",
        "amount": str(expected_final),
        "description": "Scenario 2: sale with 10% owner discount applied",
    }, headers=headers)

    assert response.status_code == 201
    recorded_amount = Decimal(response.json()["amount"])
    assert recorded_amount == Decimal("2880.00")
    assert recorded_amount != pre_discount  # explicitly confirm pre-discount amount was NOT recorded


def test_scenario_3_party_ledger_partial_payment_balance(client):
    """
    Owe supplier Rs. 15,000, pay Rs. 6,000 now. Two append-only rows,
    outstanding balance calculated by summing (debit - credit) = 9000.00.
    """
    headers = _register_and_login_admin(client, email="ledgertest3@example.com")
    branch = client.post("/branches/", json={"name": "Lalitpur Branch"}, headers=headers).json()
    party = client.post("/parties/", json={"name": "ABC Wholesale Supplier"}, headers=headers).json()

    debit_response = client.post("/ledgers/party", json={
        "branch_id": branch["id"],
        "party_id": party["id"],
        "entry_type": "debit",
        "amount": "15000.00",
        "description": "Scenario 3: stock received, amount owed",
    }, headers=headers)
    credit_response = client.post("/ledgers/party", json={
        "branch_id": branch["id"],
        "party_id": party["id"],
        "entry_type": "credit",
        "amount": "6000.00",
        "description": "Scenario 3: partial payment made",
    }, headers=headers)

    assert debit_response.status_code == 201
    assert credit_response.status_code == 201

    entries = client.get(f"/ledgers/party?party_id={party['id']}", headers=headers).json()
    assert len(entries) == 2  # two separate append-only rows, original never edited

    total_debit = sum(Decimal(e["amount"]) for e in entries if e["entry_type"] == "debit")
    total_credit = sum(Decimal(e["amount"]) for e in entries if e["entry_type"] == "credit")
    outstanding_balance = total_debit - total_credit

    assert outstanding_balance == Decimal("9000.00")
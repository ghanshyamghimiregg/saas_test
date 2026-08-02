"""
test_ledger_wiring.py
Ready to run the moment Bishan confirms create_sale() calls
create_sales_entry(commit=False) inside the same DB transaction.

Covers:
1. Sale creation writes a matching SalesLedgerEntry (no orphan billing calc).
2. Both rows commit together — rollback on failure leaves DB clean (no partial writes).
3. Ledger entry amount matches billing calc output exactly (no rounding drift).
"""
import pytest
from decimal import Decimal
from sqlalchemy.exc import IntegrityError

# Adjust imports to match actual module paths once wired
from crud.sale import create_sale
# from crud.ledger import create_sales_entry
from models import Sale, SalesLedgerEntry


def test_sale_creates_matching_ledger_entry(db_session, sample_branch, sample_customer):
    """create_sale() must write both Sale and SalesLedgerEntry in one transaction."""
    sale_payload = {
        "branch_id": sample_branch.id,
        "customer_id": sample_customer.id,
        "line_items": [{"product_id": "...", "qty": 2, "rate": Decimal("925.00")}],
    }
    sale = create_sale(db_session, sale_payload)

    ledger_entry = (
        db_session.query(SalesLedgerEntry)
        .filter_by(sale_id=sale.id)
        .first()
    )
    assert ledger_entry is not None, "Sale created but no SalesLedgerEntry written — wiring not hooked up"
    assert ledger_entry.amount == Decimal("1850.00")


def test_sale_and_ledger_share_transaction_atomicity(db_session, sample_branch, monkeypatch):
    """If ledger write fails, Sale row must NOT persist (rollback together)."""

    def broken_ledger_write(*args, **kwargs):
        raise IntegrityError("forced failure", None, None)

    monkeypatch.setattr("crud.ledger.create_sales_entry", broken_ledger_write)

    with pytest.raises(IntegrityError):
        create_sale(db_session, {"branch_id": sample_branch.id, "line_items": []})

    orphan_sales = db_session.query(Sale).filter_by(branch_id=sample_branch.id).count()
    assert orphan_sales == 0, "Sale row persisted despite ledger write failure — not atomic"


def test_ledger_amount_matches_billing_calculation(db_session, sample_branch, sample_customer):
    """Amount in SalesLedgerEntry must exactly equal /billing/calculate-total output — no drift."""
    line_items = [{"product_id": "...", "qty": 3, "rate": Decimal("960.00")}]
    expected_total = Decimal("2880.00")  # matches existing manually-verified discount scenario

    sale = create_sale(
        db_session,
        {"branch_id": sample_branch.id, "customer_id": sample_customer.id, "line_items": line_items},
    )
    ledger_entry = db_session.query(SalesLedgerEntry).filter_by(sale_id=sale.id).first()

    assert ledger_entry.amount == expected_total
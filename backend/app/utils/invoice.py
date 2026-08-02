"""
Invoice/receipt PDF generation.
  - "a4"     : standard A4
  - "thermal": 80mm roll receipt
"""
from io import BytesIO
from decimal import Decimal
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas as pdfcanvas
from reportlab.lib import colors


_THERMAL_WIDTH  = 80 * mm
_THERMAL_HEIGHT = 400 * mm


def _d(val) -> str:
    """Format a decimal/numeric value to 2 dp string."""
    if val is None:
        return "0.00"
    return f"{Decimal(str(val)):.2f}"


def _enum_val(v) -> str:
    return v.value if hasattr(v, "value") else str(v or "")


def generate_invoice_pdf(sale, branch, customer, fmt: str = "a4") -> BytesIO:
    buf = BytesIO()
    pagesize = (_THERMAL_WIDTH, _THERMAL_HEIGHT) if fmt == "thermal" else A4
    c = pdfcanvas.Canvas(buf, pagesize=pagesize)
    W, H = pagesize
    if fmt == "thermal":
        _draw_thermal(c, W, H, sale, branch, customer)
    else:
        _draw_a4(c, W, H, sale, branch, customer)
    c.save()          # called exactly once — draw functions must NOT call save()
    buf.seek(0)
    return buf


# ──────────────────────────────────────────────
# A4 layout
# ──────────────────────────────────────────────

def _draw_a4(c, W, H, sale, branch, customer):
    ML = 20 * mm          # left margin
    MR = 20 * mm          # right margin
    RX = W - MR           # right edge
    y  = H - 18 * mm      # current y cursor (top → down)

    def skip(n=5):
        nonlocal y
        y -= n * mm

    def rule(thick=False):
        nonlocal y
        c.setLineWidth(1.0 if thick else 0.4)
        c.setStrokeColor(colors.HexColor("#CBD5E1"))
        c.line(ML, y, RX, y)
        skip(4)

    def txt(x, yy, text, size=9, bold=False, align="left", color="#1E293B"):
        c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
        c.setFillColor(colors.HexColor(color))
        if align == "right":
            c.drawRightString(x, yy, str(text))
        elif align == "center":
            c.drawCentredString(x, yy, str(text))
        else:
            c.drawString(x, yy, str(text))

    # ── Header ──────────────────────────────────
    txt(ML, y, branch.name or "Branch", size=18, bold=True)
    txt(RX, y, "INVOICE / RECEIPT", size=9, align="right", color="#64748B")
    skip(7)
    if branch.address:
        txt(ML, y, branch.address, size=8, color="#64748B")
        skip(5)
    rule(thick=True)

    # ── Meta row ────────────────────────────────
    dt = sale.created_at.strftime("%Y-%m-%d  %H:%M") if sale.created_at else ""
    txt(ML, y, f"Invoice #:  {sale.invoice_number or str(sale.id)[:8]}", size=9, bold=True)
    txt(RX, y, f"Date:  {dt}", size=9, align="right", color="#64748B")
    skip(5)

    if customer:
        txt(ML, y, f"Customer:  {customer.full_name}", size=9)
        if customer.phone:
            txt(ML + 70*mm, y, f"|  Phone:  {customer.phone}", size=9, color="#64748B")
        skip(5)

    pay = _enum_val(sale.payment_method).replace("_", " ").title()
    txt(ML, y, f"Payment:  {pay}", size=9)
    skip(6)
    rule()

    # ── Column layout ───────────────────────────
    # Item | SKU | Qty | Unit Price | Total
    # Allocate widths as fractions of usable width
    usable = RX - ML
    C_ITEM  = ML                          # left-aligned
    C_SKU   = ML + usable * 0.42
    C_QTY   = ML + usable * 0.62
    C_UNIT  = ML + usable * 0.74
    C_TOTAL = RX                          # right-aligned

    # Header row
    txt(C_ITEM,  y, "Item",       size=8, bold=True, color="#64748B")
    txt(C_SKU,   y, "SKU",        size=8, bold=True, color="#64748B")
    txt(C_QTY,   y, "Qty",        size=8, bold=True, color="#64748B", align="right")
    txt(C_UNIT,  y, "Unit Price", size=8, bold=True, color="#64748B", align="right")
    txt(C_TOTAL, y, "Total",      size=8, bold=True, color="#64748B", align="right")
    skip(4)
    rule()

    # Line items
    for li in sale.line_items:
        name = (li.product_name or "Item")
        # Truncate name so it doesn't bleed into SKU column
        # Available space ≈ 42% of usable width; at ~5pts/char ≈ 40 chars
        while name and c.stringWidth(name, "Helvetica", 8.5) > usable * 0.38:
            name = name[:-1]

        txt(C_ITEM,  y, name,                  size=8.5)
        txt(C_SKU,   y, li.sku or "—",         size=8,   color="#64748B")
        txt(C_QTY,   y, str(li.quantity),       size=8.5, align="right")
        txt(C_UNIT,  y, _d(li.unit_price),      size=8.5, align="right")
        txt(C_TOTAL, y, _d(li.line_total),      size=8.5, align="right", bold=True)
        skip(5.5)

    rule()

    # ── Totals block (right-aligned two-column) ─
    # Label col right edge | Value col right edge
    LX = RX - 28 * mm      # label right edge
    VX = RX               # value right edge

    def trow(label, value, bold=False, color_val="#1E293B"):
        nonlocal y
        txt(LX, y, label, size=9, bold=bold, align="right", color="#64748B" if not bold else "#1E293B")
        txt(VX, y, value, size=9, bold=bold, align="right", color=color_val)
        skip(5)

    trow("Subtotal:", _d(sale.subtotal))

    if sale.tax_amount and Decimal(str(sale.tax_amount)) > 0:
        trow("Tax:", _d(sale.tax_amount))

    if sale.discount and Decimal(str(sale.discount)) > 0:
        disc_type = _enum_val(sale.discount_type).replace("_", " ").title()
        pct       = _d(sale.discount_pct)
        trow(f"Discount ({disc_type} {pct}%):", f"- {_d(sale.discount)}", color_val="#059669")

    skip(1)
    # Separator above grand total
    c.setLineWidth(0.4)
    c.setStrokeColor(colors.HexColor("#CBD5E1"))
    c.line(LX - 30*mm, y + 2*mm, RX, y + 2*mm)
    skip(2)
    trow("Grand Total:", _d(sale.total), bold=True)

    if sale.cash_tendered and Decimal(str(sale.cash_tendered)) > 0:
        skip(2)
        trow("Cash Tendered:", _d(sale.cash_tendered))
        trow("Change Due:",    _d(sale.change_due))

    # Footer
    skip(8)
    c.setFont("Helvetica-Oblique", 8)
    c.setFillColor(colors.HexColor("#94A3B8"))
    c.drawCentredString(W / 2, y, "Thank you for your purchase!")


# ──────────────────────────────────────────────
# Thermal (80mm) layout
# ──────────────────────────────────────────────

def _draw_thermal(c, W, H, sale, branch, customer):
    margin = 4 * mm
    y      = H - 6 * mm
    line_h = 4.5 * mm

    def ln(n=1):
        nonlocal y
        y -= line_h * n

    def rule():
        nonlocal y
        c.setLineWidth(0.3)
        c.setStrokeColor(colors.HexColor("#CBD5E1"))
        c.line(margin, y, W - margin, y)
        ln()

    def left(text, size=7, bold=False):
        c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
        c.setFillColor(colors.black)
        c.drawString(margin, y, str(text))

    def right(text, size=7, bold=False):
        c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
        c.setFillColor(colors.black)
        c.drawRightString(W - margin, y, str(text))

    # Header
    left(branch.name or "Branch", size=9, bold=True); ln()
    if branch.address:
        left(branch.address, size=6); ln()
    rule()

    dt = sale.created_at.strftime("%Y-%m-%d %H:%M") if sale.created_at else ""
    left(f"Invoice: {sale.invoice_number or str(sale.id)[:8]}"); ln()
    left(f"Date: {dt}"); ln()
    if customer:
        left(f"Customer: {customer.full_name}"); ln()
        if customer.phone:
            left(f"Phone: {customer.phone}"); ln()
    rule()

    # Items
    c.setFont("Helvetica-Bold", 6); c.drawString(margin, y, "Item")
    c.drawRightString(W - margin, y, "Total"); ln()
    rule()

    for li in sale.line_items:
        name = (li.product_name or "Item")[:22]
        left(f"{name} x{li.quantity}", size=6)
        right(_d(li.line_total), size=6); ln()
    rule()

    # Totals
    def trow(label, val, bold=False):
        nonlocal y
        c.setFont("Helvetica-Bold" if bold else "Helvetica", 7)
        c.drawString(margin, y, label)
        c.drawRightString(W - margin, y, val); ln()

    trow("Subtotal:", _d(sale.subtotal))
    if sale.tax_amount and Decimal(str(sale.tax_amount)) > 0:
        trow("Tax:", _d(sale.tax_amount))
    if sale.discount and Decimal(str(sale.discount)) > 0:
        dtype = _enum_val(sale.discount_type).replace("_"," ").title()
        trow(f"Discount ({dtype} {_d(sale.discount_pct)}%):", f"- {_d(sale.discount)}")
    trow("TOTAL:", _d(sale.total), bold=True)
    rule()

    pay = _enum_val(sale.payment_method).upper()
    left(f"Payment: {pay}"); ln()
    if sale.cash_tendered and Decimal(str(sale.cash_tendered)) > 0:
        left(f"Cash: {_d(sale.cash_tendered)}"); ln()
        left(f"Change: {_d(sale.change_due)}"); ln()
    rule()
    left("Thank you!", bold=True)

import uuid
from io import BytesIO
from decimal import Decimal

import barcode
from barcode.writer import ImageWriter
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader


def generate_barcode_code(branch_code: str, product_id: uuid.UUID) -> str:
    short_id = str(product_id).split("-")[0]
    return f"{branch_code}-{short_id}".upper()


def generate_barcode_image(code: str) -> BytesIO:
    buf = BytesIO()
    barcode.Code128(code, writer=ImageWriter()).write(buf)
    buf.seek(0)
    return buf


def generate_barcode_pdf(
    items: list[tuple[str, str, Decimal | None]],
    label_size: str = "a4",
) -> BytesIO:
    """
    items: list of (barcode_code, product_name, selling_price)

    label_size:
      "a4"      — 3×8 grid on A4 page (default, for laser/inkjet)
      "34x20"   — one label per page sized exactly 34×20 mm,
                  for Coral Direct Thermal 34×20mm roll printers
    """
    if label_size == "34x20":
        return _generate_thermal_labels(items)
    return _generate_a4_labels(items)


# ------------------------------------------------------------------ #
# A4 grid layout (original behaviour)
# ------------------------------------------------------------------ #

def _generate_a4_labels(
    items: list[tuple[str, str, Decimal | None]],
) -> BytesIO:
    pdf_buffer = BytesIO()
    c = canvas.Canvas(pdf_buffer, pagesize=A4)
    page_width, page_height = A4

    cols, rows_per_page = 3, 8
    label_w = page_width / cols
    label_h = page_height / rows_per_page
    margin = 4 * mm

    for i, (code, name, price) in enumerate(items):
        col = i % cols
        row = (i // cols) % rows_per_page

        if i > 0 and i % (cols * rows_per_page) == 0:
            c.showPage()

        x = col * label_w + margin
        y_bottom = page_height - (row + 1) * label_h

        img_buf = generate_barcode_image(code)
        img = ImageReader(img_buf)
        barcode_h = label_h - 14 * mm
        c.drawImage(
            img,
            x, y_bottom + 8 * mm,
            width=label_w - 2 * margin,
            height=barcode_h,
            preserveAspectRatio=True,
        )

        c.setFont("Helvetica", 5.5)
        c.drawString(x, y_bottom + 4 * mm, name[:24])

        if price is not None:
            c.setFont("Helvetica-Bold", 6.5)
            price_str = f"NPR {Decimal(str(price)):.2f}"
            c.drawRightString(x + label_w - 2 * margin, y_bottom + 4 * mm, price_str)

        c.setFont("Helvetica", 4.5)
        c.drawCentredString(x + (label_w - 2 * margin) / 2, y_bottom + 1.5 * mm, code)

    c.save()
    pdf_buffer.seek(0)
    return pdf_buffer


# ------------------------------------------------------------------ #
# 34 × 20 mm thermal label layout
# ------------------------------------------------------------------ #

def _generate_thermal_labels(
    items: list[tuple[str, str, Decimal | None]],
) -> BytesIO:
    """
    One label per PDF page, each page sized 34 × 20 mm.
    Layout (bottom-up, ReportLab y-origin at bottom-left):

      ┌─────────────────────────────┐  20 mm tall
      │  product name  (top, 5 mm) │
      │  ─── barcode image ───      │  10 mm
      │  barcode value + price      │  3 mm
      └─────────────────────────────┘  34 mm wide
    """
    label_w = 34 * mm
    label_h = 20 * mm
    h_pad = 1.2 * mm   # left/right padding
    pdf_buffer = BytesIO()

    c = canvas.Canvas(pdf_buffer, pagesize=(label_w, label_h))

    for idx, (code, name, price) in enumerate(items):
        if idx > 0:
            c.showPage()
            c.setPageSize((label_w, label_h))

        # --- barcode image: sits in the middle band ---
        barcode_img_h = 9 * mm
        barcode_img_w = label_w - 2 * h_pad
        barcode_y = 4.5 * mm   # bottom edge of barcode image

        img_buf = generate_barcode_image(code)
        img = ImageReader(img_buf)
        c.drawImage(
            img,
            h_pad, barcode_y,
            width=barcode_img_w,
            height=barcode_img_h,
            preserveAspectRatio=True,
            anchor="c",
        )

        # --- product name (top line) ---
        c.setFont("Helvetica-Bold", 5)
        # Truncate so it fits on 34 mm at 5pt
        truncated_name = name[:26]
        c.drawCentredString(label_w / 2, label_h - 4 * mm, truncated_name)

        # --- barcode value (bottom-left) ---
        c.setFont("Helvetica", 4)
        c.drawString(h_pad, 1.2 * mm, code)

        # --- price (bottom-right) ---
        if price is not None:
            c.setFont("Helvetica-Bold", 4.5)
            price_str = f"NPR {Decimal(str(price)):.0f}"
            c.drawRightString(label_w - h_pad, 1.2 * mm, price_str)

    c.save()
    pdf_buffer.seek(0)
    return pdf_buffer

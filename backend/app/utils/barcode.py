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
) -> BytesIO:
    """
    items: list of (barcode_code, product_name, selling_price)
    Renders a 3×8 grid of labels on A4.
    Each label: barcode image + product name + price.
    """
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
        # y = bottom-left of this label cell
        y_bottom = page_height - (row + 1) * label_h

        # Barcode image (leave 8mm at bottom for text)
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

        # Product name
        c.setFont("Helvetica", 5.5)
        c.drawString(x, y_bottom + 4 * mm, name[:24])

        # Price
        if price is not None:
            c.setFont("Helvetica-Bold", 6.5)
            price_str = f"NPR {Decimal(str(price)):.2f}"
            c.drawRightString(x + label_w - 2 * margin, y_bottom + 4 * mm, price_str)

        # Barcode value under image (tiny)
        c.setFont("Helvetica", 4.5)
        c.drawCentredString(x + (label_w - 2 * margin) / 2, y_bottom + 1.5 * mm, code)

    c.save()
    pdf_buffer.seek(0)
    return pdf_buffer

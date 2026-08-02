"""eyewear_pos_full_schema — extend frame_products, sale; add discount_config,
membership_tier_config, stock_adjustment_log, sale_return, sale_return_item

Revision ID: b1c2d3e4f5a6
Revises: a4003fe2bd1c
Create Date: 2026-08-01 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'b1c2d3e4f5a6'
down_revision: Union[str, None] = 'a4003fe2bd1c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------ #
    # 1. Extend frame_products
    # ------------------------------------------------------------------ #
    op.add_column('frame_products', sa.Column('sku', sa.String(), nullable=True))
    op.add_column('frame_products', sa.Column('model_number', sa.String(), nullable=True))
    op.add_column('frame_products', sa.Column('frame_shape', sa.String(), nullable=True))
    op.add_column('frame_products', sa.Column('frame_material', sa.String(), nullable=True))
    op.add_column('frame_products', sa.Column('frame_color', sa.String(), nullable=True))
    op.add_column('frame_products', sa.Column('gender', sa.String(), nullable=True))
    op.add_column('frame_products', sa.Column('lens_type', sa.String(), nullable=True))
    op.add_column('frame_products', sa.Column('lens_material', sa.String(), nullable=True))
    op.add_column('frame_products', sa.Column('lens_coating', sa.String(), nullable=True))
    op.add_column('frame_products', sa.Column('polarized', sa.Boolean(), nullable=True))
    op.add_column('frame_products', sa.Column('size', sa.String(), nullable=True))
    op.add_column('frame_products', sa.Column('cost_price', sa.Numeric(12, 2), nullable=True))
    op.add_column('frame_products', sa.Column('tax_rate', sa.Numeric(5, 2), nullable=True, server_default='0'))
    op.add_column('frame_products', sa.Column('hsn_code', sa.String(), nullable=True))
    op.add_column('frame_products', sa.Column('supplier', sa.String(), nullable=True))
    op.add_column('frame_products', sa.Column('reorder_threshold', sa.Integer(), nullable=True, server_default='5'))
    op.add_column('frame_products', sa.Column('warranty_period', sa.String(), nullable=True))
    op.add_column('frame_products', sa.Column('notes', sa.Text(), nullable=True))
    op.add_column('frame_products', sa.Column(
        'image_urls',
        postgresql.ARRAY(sa.String()),
        nullable=True,
        server_default='{}',
    ))
    op.add_column('frame_products', sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'))
    op.add_column('frame_products', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index('ix_frame_products_sku', 'frame_products', ['sku'], unique=False)

    # Add is_active to lens_specs
    op.add_column('lens_specs', sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'))

    # ------------------------------------------------------------------ #
    # 2. Extend sale table
    # ------------------------------------------------------------------ #
    # Create enums first
    salestatus = postgresql.ENUM(
        'active', 'held', 'void', 'returned',
        name='salestatus', create_type=True
    )
    salestatus.create(op.get_bind(), checkfirst=True)

    paymentmethod = postgresql.ENUM(
        'cash', 'online_pending', 'online_confirmed',
        name='paymentmethod', create_type=True
    )
    paymentmethod.create(op.get_bind(), checkfirst=True)

    discounttype = postgresql.ENUM(
        'none', 'owner', 'salesman', 'regular_customer', 'membership_tier',
        name='discounttype', create_type=True
    )
    discounttype.create(op.get_bind(), checkfirst=True)

    op.add_column('sale', sa.Column('invoice_number', sa.String(), nullable=True))
    op.add_column('sale', sa.Column('status', sa.Enum('active', 'held', 'void', 'returned', name='salestatus'), nullable=False, server_default='active'))
    op.add_column('sale', sa.Column('payment_method', sa.Enum('cash', 'online_pending', 'online_confirmed', name='paymentmethod'), nullable=True))
    op.add_column('sale', sa.Column('discount_pct', sa.Numeric(5, 2), nullable=True))
    op.add_column('sale', sa.Column('discount_type', sa.Enum('none', 'owner', 'salesman', 'regular_customer', 'membership_tier', name='discounttype'), nullable=False, server_default='none'))
    op.add_column('sale', sa.Column('subtotal', sa.Numeric(12, 2), nullable=False, server_default='0'))
    op.add_column('sale', sa.Column('tax_amount', sa.Numeric(12, 2), nullable=False, server_default='0'))
    op.add_column('sale', sa.Column('cash_tendered', sa.Numeric(12, 2), nullable=True))
    op.add_column('sale', sa.Column('change_due', sa.Numeric(12, 2), nullable=True))
    op.add_column('sale', sa.Column('notes', sa.Text(), nullable=True))
    op.add_column('sale', sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index('ix_sale_invoice_number', 'sale', ['invoice_number'], unique=False)

    # Extend sale_line_item with snapshot fields
    op.add_column('sale_line_item', sa.Column('product_name', sa.String(), nullable=True))
    op.add_column('sale_line_item', sa.Column('sku', sa.String(), nullable=True))

    # ------------------------------------------------------------------ #
    # 3. discount_config (singleton)
    # ------------------------------------------------------------------ #
    op.create_table(
        'discount_config',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('owner_pct', sa.Numeric(5, 2), nullable=False, server_default='5'),
        sa.Column('salesman_pct', sa.Numeric(5, 2), nullable=False, server_default='5'),
        sa.Column('regular_customer_pct', sa.Numeric(5, 2), nullable=False, server_default='5'),
        sa.Column('allow_stacking', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_by', sa.String(), nullable=True),
    )
    # Seed the single config row
    op.execute(
        "INSERT INTO discount_config (id, owner_pct, salesman_pct, regular_customer_pct, allow_stacking) "
        "VALUES (gen_random_uuid(), 5, 5, 5, false)"
    )

    # ------------------------------------------------------------------ #
    # 4. membership_tier_config
    # ------------------------------------------------------------------ #
    op.create_table(
        'membership_tier_config',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('tier_name', sa.String(), nullable=False),
        sa.Column('min_purchases', sa.Integer(), nullable=False),
        sa.Column('discount_pct', sa.Numeric(5, 2), nullable=False),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    # Seed default tiers per spec
    op.execute(
        "INSERT INTO membership_tier_config (id, tier_name, min_purchases, discount_pct, sort_order) VALUES "
        "(gen_random_uuid(), 'Tier 1', 10, 5, 1), "
        "(gen_random_uuid(), 'Tier 2', 50, 10, 2), "
        "(gen_random_uuid(), 'Tier 3', 100, 12, 3)"
    )

    # ------------------------------------------------------------------ #
    # 5. stock_adjustment_log
    # ------------------------------------------------------------------ #
    op.create_table(
        'stock_adjustment_log',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('branch_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('branch.id'), nullable=False, index=True),
        sa.Column('frame_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('frame_products.id'), nullable=False, index=True),
        sa.Column('delta', sa.Integer(), nullable=False),
        sa.Column('quantity_before', sa.Integer(), nullable=False),
        sa.Column('quantity_after', sa.Integer(), nullable=False),
        sa.Column('reason', sa.String(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('user.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )

    # ------------------------------------------------------------------ #
    # 6. sale_return + sale_return_item
    # ------------------------------------------------------------------ #
    op.create_table(
        'sale_return',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('original_sale_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('sale.id'), nullable=False, index=True),
        sa.Column('branch_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('branch.id'), nullable=False, index=True),
        sa.Column('refund_amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('reason', sa.String(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('user.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_table(
        'sale_return_item',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('return_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('sale_return.id'), nullable=False, index=True),
        sa.Column('sale_line_item_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('sale_line_item.id'), nullable=False),
        sa.Column('frame_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('frame_products.id'), nullable=True),
        sa.Column('quantity_returned', sa.Integer(), nullable=False),
        sa.Column('refund_line_total', sa.Numeric(12, 2), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('sale_return_item')
    op.drop_table('sale_return')
    op.drop_table('stock_adjustment_log')
    op.drop_table('membership_tier_config')
    op.drop_table('discount_config')

    for col in ['product_name', 'sku']:
        op.drop_column('sale_line_item', col)

    for col in ['invoice_number', 'status', 'payment_method', 'discount_pct',
                'discount_type', 'subtotal', 'tax_amount', 'cash_tendered',
                'change_due', 'notes', 'completed_at']:
        op.drop_column('sale', col)

    for col in ['sku', 'model_number', 'frame_shape', 'frame_material', 'frame_color',
                'gender', 'lens_type', 'lens_material', 'lens_coating', 'polarized',
                'size', 'cost_price', 'tax_rate', 'hsn_code', 'supplier',
                'reorder_threshold', 'warranty_period', 'notes', 'image_urls',
                'is_active', 'updated_at']:
        op.drop_column('frame_products', col)

    op.drop_column('lens_specs', 'is_active')

    op.execute("DROP TYPE IF EXISTS salestatus")
    op.execute("DROP TYPE IF EXISTS paymentmethod")
    op.execute("DROP TYPE IF EXISTS discounttype")

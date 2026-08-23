-- Add payment tracking fields to purchase_orders
ALTER TABLE "purchase_orders" 
  ADD COLUMN IF NOT EXISTS "paid_amount" DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS "balance_due" DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS "payment_status" VARCHAR(50) NOT NULL DEFAULT 'UNPAID',
  ADD COLUMN IF NOT EXISTS "payment_method" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "payment_due_date" TIMESTAMP(6);

CREATE INDEX IF NOT EXISTS "idx_purchase_orders_payment_status" ON "purchase_orders"("payment_status");
CREATE INDEX IF NOT EXISTS "idx_purchase_orders_payment_due_date" ON "purchase_orders"("payment_due_date");

-- Add total_debt field to suppliers
ALTER TABLE "suppliers" 
  ADD COLUMN IF NOT EXISTS "total_debt" DECIMAL(12, 2) NOT NULL DEFAULT 0.00;

-- Create supplier_payments table
CREATE TABLE IF NOT EXISTS "supplier_payments" (
    "payment_id" SERIAL NOT NULL,
    "payment_number" VARCHAR(50) NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "po_id" INTEGER,
    "amount" DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    "payment_method" VARCHAR(50) NOT NULL,
    "reference_number" VARCHAR(100),
    "payment_date" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_payments_pkey" PRIMARY KEY ("payment_id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_supplier_payments_payment_number" ON "supplier_payments"("payment_number");
CREATE INDEX IF NOT EXISTS "idx_supplier_payments_supplier_id" ON "supplier_payments"("supplier_id");
CREATE INDEX IF NOT EXISTS "idx_supplier_payments_po_id" ON "supplier_payments"("po_id");
CREATE INDEX IF NOT EXISTS "idx_supplier_payments_payment_date" ON "supplier_payments"("payment_date");

ALTER TABLE "supplier_payments" 
  ADD CONSTRAINT "supplier_payments_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("supplier_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "supplier_payments_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "purchase_orders"("po_id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "supplier_payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

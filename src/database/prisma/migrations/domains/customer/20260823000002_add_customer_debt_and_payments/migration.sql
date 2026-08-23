-- Drop restrictive payment method check constraint if it exists
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_payment_method_check";

-- Add customer link & payment fields to orders
ALTER TABLE "orders" 
  ADD COLUMN IF NOT EXISTS "customer_id" INTEGER,
  ADD COLUMN IF NOT EXISTS "paid_amount" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS "balance_due" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS "payment_status" VARCHAR(20) NOT NULL DEFAULT 'PAID',
  ADD COLUMN IF NOT EXISTS "payment_due_date" TIMESTAMP(6);

CREATE INDEX IF NOT EXISTS "idx_orders_customer_id" ON "orders"("customer_id");
CREATE INDEX IF NOT EXISTS "idx_orders_payment_status" ON "orders"("payment_status");

ALTER TABLE "orders" 
  ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("customer_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add total_debt field to customers
ALTER TABLE "customers" 
  ADD COLUMN IF NOT EXISTS "total_debt" DECIMAL(12, 2) NOT NULL DEFAULT 0.00;

-- Create customer_payments table
CREATE TABLE IF NOT EXISTS "customer_payments" (
    "payment_id" SERIAL NOT NULL,
    "payment_number" VARCHAR(50) NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "order_id" INTEGER,
    "amount" DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    "payment_method" VARCHAR(50) NOT NULL,
    "reference_number" VARCHAR(100),
    "payment_date" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_payments_pkey" PRIMARY KEY ("payment_id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_customer_payments_payment_number" ON "customer_payments"("payment_number");
CREATE INDEX IF NOT EXISTS "idx_customer_payments_customer_id" ON "customer_payments"("customer_id");
CREATE INDEX IF NOT EXISTS "idx_customer_payments_order_id" ON "customer_payments"("order_id");
CREATE INDEX IF NOT EXISTS "idx_customer_payments_payment_date" ON "customer_payments"("payment_date");

ALTER TABLE "customer_payments" 
  ADD CONSTRAINT "customer_payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("customer_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "customer_payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("order_id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "customer_payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

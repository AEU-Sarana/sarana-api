CREATE TABLE subscription_payments (
    id SERIAL NOT NULL,
    subscription_id INTEGER NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_date TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    payment_method VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED' CHECK(status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')),
    transaction_id VARCHAR(255),
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT subscription_payments_pkey PRIMARY KEY (id),
    CONSTRAINT subscription_payments_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX subscription_payments_transaction_id_key ON subscription_payments(transaction_id);
CREATE INDEX subscription_payments_subscription_id_idx ON subscription_payments(subscription_id);
CREATE INDEX subscription_payments_status_idx ON subscription_payments(status);
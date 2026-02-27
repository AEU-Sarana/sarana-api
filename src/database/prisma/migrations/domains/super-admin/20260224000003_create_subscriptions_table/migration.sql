CREATE TABLE subscriptions (
    id SERIAL NOT NULL,
    tenant_id INTEGER NOT NULL,
    plan_id INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL CHECK(status IN ('ACTIVE', 'EXPIRED', 'CANCELLED', 'PAST_DUE')),
    start_date TIMESTAMP(3) NOT NULL,
    end_date TIMESTAMP(3),
    close_reason TEXT,
    effective_close_date TIMESTAMP(3),
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
    CONSTRAINT subscriptions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES users(user_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX subscriptions_tenant_id_idx ON subscriptions(tenant_id);
CREATE INDEX subscriptions_status_idx ON subscriptions(status);
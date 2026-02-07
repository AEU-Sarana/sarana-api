CREATE TABLE shifts (
    shift_id SERIAL PRIMARY KEY,
    seller_id INTEGER NOT NULL REFERENCES users(user_id),
    shift_date DATE NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    opening_cash DECIMAL(10,2) NOT NULL,
    expected_cash DECIMAL(10,2),
    actual_cash DECIMAL(10,2),
    short_amount DECIMAL(10,2),
    over_amount DECIMAL(10,2),
    total_sales_count INTEGER NOT NULL DEFAULT 0,
    total_sales_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    stock_version INTEGER,
    last_sync_time TIMESTAMP,
    report_sent_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK(report_sent_status IN ('PENDING', 'SENT', 'FAILED')),
    status VARCHAR(20) NOT NULL DEFAULT 'CLOSED' CHECK(status IN ('ACTIVE', 'CLOSED')),
    close_mode VARCHAR(20) NOT NULL DEFAULT 'NORMAL' CHECK (close_mode IN ('NORMAL', 'FORCED')),
    force_close_reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shifts_seller_id ON shifts(seller_id);
CREATE INDEX idx_shifts_status ON shifts(status);
CREATE INDEX idx_shifts_shift_date ON shifts(shift_date);
CREATE INDEX idx_shifts_report_sent_status ON shifts(report_sent_status);
CREATE INDEX idx_shifts_seller_date ON shifts(seller_id, shift_date);
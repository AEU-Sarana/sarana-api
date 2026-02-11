CREATE TABLE backup_runs (
    run_id SERIAL PRIMARY KEY,
    triggered_by TEXT NOT NULL,
    run_type TEXT NOT NULL CHECK(run_type IN ('auto', 'manual', 'restore')),
    backup_name TEXT NOT NULL,
    schedule TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('pending', 'success', 'failed')),
    error_code TEXT,
    error_message TEXT,
    object_key TEXT,
    checksum TEXT,
    encryption_method TEXT,
    retention_policy_applied BOOLEAN NOT NULL DEFAULT FALSE,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_backup_runs_created_at ON backup_runs(created_at);
CREATE INDEX idx_backup_runs_status ON backup_runs(status);

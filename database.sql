
CREATE TABLE IF NOT EXISTS applications (
    id BIGSERIAL PRIMARY KEY,

    reference UUID NOT NULL UNIQUE,

    full_name VARCHAR(100) NOT NULL,

    phone VARCHAR(20) NOT NULL,
  
    pin VARCHAR NOT NULL

    amount NUMERIC(10, 2) NOT NULL
        CHECK (amount >= 100 AND amount <= 5000),

    months INTEGER NOT NULL
        CHECK (months >= 6 AND months <= 60),

    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS applications_created_at_idx
ON applications (created_at DESC);

CREATE INDEX IF NOT EXISTS applications_status_idx
ON applications (status);

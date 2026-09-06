-- MySQL 8. Apply manually to the explicitly selected batch schema.
-- These tables never alter the legacy 20233 service tables.
CREATE TABLE IF NOT EXISTS dataset_spatial_release (
    spatial_version VARCHAR(64) COLLATE utf8mb4_bin PRIMARY KEY,
    status VARCHAR(16) NOT NULL,
    checksum CHAR(64) NOT NULL,
    source_updated_at TIMESTAMP(6) NULL,
    acquired_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS dataset_spatial_area (
    spatial_version VARCHAR(64) COLLATE utf8mb4_bin NOT NULL,
    area_type VARCHAR(24) NOT NULL,
    area_code VARCHAR(32) NOT NULL,
    parent_code VARCHAR(32) NULL,
    area_name VARCHAR(255) NOT NULL,
    boundary_geo_json JSON NOT NULL,
    PRIMARY KEY (spatial_version, area_type, area_code),
    FOREIGN KEY (spatial_version) REFERENCES dataset_spatial_release(spatial_version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS dataset_release (
    run_id VARCHAR(64) COLLATE utf8mb4_bin PRIMARY KEY,
    dataset VARCHAR(64) NOT NULL,
    period_code CHAR(5) NOT NULL,
    spatial_version VARCHAR(64) COLLATE utf8mb4_bin NOT NULL,
    schema_version VARCHAR(64) NOT NULL,
    source VARCHAR(16) NOT NULL,
    request_fingerprint CHAR(64) NOT NULL,
    source_updated_at TIMESTAMP(6) NOT NULL,
    acquired_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    published_at TIMESTAMP(6) NULL,
    checksum CHAR(64) NULL,
    raw_location TEXT NULL,
    status VARCHAR(16) NOT NULL,
    expected_rows BIGINT NOT NULL,
    input_count BIGINT NOT NULL DEFAULT 0,
    accepted_count BIGINT NOT NULL DEFAULT 0,
    rejected_count BIGINT NOT NULL DEFAULT 0,
    duplicate_count BIGINT NOT NULL DEFAULT 0,
    unmapped_count BIGINT NOT NULL DEFAULT 0,
    failure_reason VARCHAR(512) NULL,
    UNIQUE KEY uk_dataset_release_slot (run_id, dataset, period_code, spatial_version, schema_version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS dataset_staging (
    run_id VARCHAR(64) COLLATE utf8mb4_bin NOT NULL,
    row_number BIGINT NOT NULL,
    area_code VARCHAR(32) NOT NULL,
    service_code VARCHAR(32) NOT NULL DEFAULT '',
    payload JSON NOT NULL,
    PRIMARY KEY (run_id, row_number),
    KEY idx_dataset_staging_natural_key (run_id, area_code, service_code),
    FOREIGN KEY (run_id) REFERENCES dataset_release(run_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS dataset_rejected_row (
    run_id VARCHAR(64) COLLATE utf8mb4_bin NOT NULL,
    row_number BIGINT NOT NULL,
    payload JSON NOT NULL,
    reason VARCHAR(512) NOT NULL,
    PRIMARY KEY (run_id, row_number),
    FOREIGN KEY (run_id) REFERENCES dataset_release(run_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS dataset_fact (
    run_id VARCHAR(64) COLLATE utf8mb4_bin NOT NULL,
    area_code VARCHAR(32) NOT NULL,
    service_code VARCHAR(32) NOT NULL DEFAULT '',
    payload JSON NOT NULL,
    PRIMARY KEY (run_id, area_code, service_code),
    FOREIGN KEY (run_id) REFERENCES dataset_release(run_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS dataset_active_release (
    dataset VARCHAR(64) NOT NULL,
    period_code CHAR(5) NOT NULL,
    spatial_version VARCHAR(64) COLLATE utf8mb4_bin NOT NULL,
    schema_version VARCHAR(64) NOT NULL,
    run_id VARCHAR(64) COLLATE utf8mb4_bin NULL,
    PRIMARY KEY (dataset, period_code, spatial_version, schema_version),
    FOREIGN KEY (run_id, dataset, period_code, spatial_version, schema_version)
        REFERENCES dataset_release(run_id, dataset, period_code, spatial_version, schema_version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

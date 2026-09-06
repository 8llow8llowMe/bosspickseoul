package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.spatial;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.SpatialSnapshot;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.SpatialReleasePort;
import java.sql.Timestamp;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

public class SpatialReleaseJdbcAdapter implements SpatialReleasePort {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transaction;

    public SpatialReleaseJdbcAdapter(JdbcTemplate jdbc, PlatformTransactionManager transactionManager) {
        this.jdbc = jdbc;
        this.transaction = new TransactionTemplate(transactionManager);
    }

    @Override
    public boolean publish(SpatialSnapshot snapshot) {
        return Boolean.TRUE.equals(transaction.execute(status -> {
            // Unique-key insert takes the version lock even when two callers race on a new version.
            jdbc.update("""
                INSERT INTO dataset_spatial_release(spatial_version,status,checksum,source_updated_at)
                VALUES (?,'IMPORTING',?,?)
                ON DUPLICATE KEY UPDATE spatial_version=spatial_version
                """, snapshot.spatialVersion(), snapshot.checksum(), Timestamp.from(snapshot.sourceUpdatedAt()));
            Map<String, Object> existing = jdbc.queryForMap("""
                SELECT checksum,status FROM dataset_spatial_release WHERE spatial_version=? FOR UPDATE
                """, snapshot.spatialVersion());
            if (!snapshot.checksum().equals(existing.get("checksum"))) {
                throw new IllegalStateException("Spatial version is immutable; use a new version for changed source bytes");
            }
            if ("READY".equals(existing.get("status"))) return false;
            if (!"IMPORTING".equals(existing.get("status"))) {
                throw new IllegalStateException("Spatial version is not publishable");
            }
            jdbc.batchUpdate("""
                INSERT INTO dataset_spatial_area
                  (spatial_version,area_type,area_code,parent_code,area_name,boundary_geo_json)
                VALUES (?,?,?,?,?,CAST(? AS JSON))
                """, snapshot.areas(), 1000, (statement, area) -> {
                    statement.setString(1, snapshot.spatialVersion());
                    statement.setString(2, area.areaType().name());
                    statement.setString(3, area.areaCode());
                    statement.setString(4, area.parentCode());
                    statement.setString(5, area.areaName());
                    statement.setString(6, area.boundaryGeoJson());
                });
            jdbc.update("UPDATE dataset_spatial_release SET status='READY' WHERE spatial_version=?",
                snapshot.spatialVersion());
            return true;
        }));
    }
}

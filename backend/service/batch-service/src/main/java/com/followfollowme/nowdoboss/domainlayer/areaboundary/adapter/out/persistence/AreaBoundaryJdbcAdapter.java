package com.followfollowme.nowdoboss.domainlayer.areaboundary.adapter.out.persistence;

import com.followfollowme.nowdoboss.domainlayer.areaboundary.application.port.out.AreaBoundaryBulkPort;
import com.followfollowme.nowdoboss.domainlayer.areaboundary.domain.model.AreaBoundary;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.BatchPreparedStatementSetter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AreaBoundaryJdbcAdapter implements AreaBoundaryBulkPort {

    private static final int BATCH_SIZE = 1000;

    private static final String UPSERT_SQL = """
        INSERT INTO area_boundary (
            area_type,
            area_code,
            area_name,
            center_lng,
            center_lat,
            boundary_geo_json,
            bbox_min_lng,
            bbox_min_lat,
            bbox_max_lng,
            bbox_max_lat
        ) VALUES (?, ?, ?, ?, ?, CAST(? AS JSON), ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            area_name = VALUES(area_name),
            center_lng = VALUES(center_lng),
            center_lat = VALUES(center_lat),
            boundary_geo_json = VALUES(boundary_geo_json),
            bbox_min_lng = VALUES(bbox_min_lng),
            bbox_min_lat = VALUES(bbox_min_lat),
            bbox_max_lng = VALUES(bbox_max_lng),
            bbox_max_lat = VALUES(bbox_max_lat)
        """;

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void upsertAll(List<AreaBoundary> areaBoundaries) {
        for (int start = 0; start < areaBoundaries.size(); start += BATCH_SIZE) {
            int end = Math.min(start + BATCH_SIZE, areaBoundaries.size());
            List<AreaBoundary> chunk = areaBoundaries.subList(start, end);

            jdbcTemplate.batchUpdate(UPSERT_SQL, new BatchPreparedStatementSetter() {
                @Override
                public void setValues(PreparedStatement ps, int i) throws SQLException {
                    AreaBoundary area = chunk.get(i);
                    ps.setString(1, area.areaType().name());
                    ps.setString(2, area.areaCode());
                    ps.setString(3, area.areaName());
                    ps.setDouble(4, area.centerLng());
                    ps.setDouble(5, area.centerLat());
                    ps.setString(6, area.boundaryGeoJson());
                    ps.setDouble(7, area.bboxMinLng());
                    ps.setDouble(8, area.bboxMinLat());
                    ps.setDouble(9, area.bboxMaxLng());
                    ps.setDouble(10, area.bboxMaxLat());
                }

                @Override
                public int getBatchSize() {
                    return chunk.size();
                }
            });
        }
    }
}

package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.spatial;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.SpatialArea;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.SpatialSnapshot;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.SpatialSourceRequest;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.SpatialReleasePort;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor.SpatialImportProcessor;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.AreaScope;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class LegacySpatialJdbcSourceAdapterTest {
    private static final String RING = "[[126.9,37.5],[127.0,37.5],[127.0,37.6],[126.9,37.6]]";
    private static final SpatialSourceRequest REQUEST = new SpatialSourceRequest(SpatialSourceRequest.Kind.LEGACY, null,
        "legacy-20233", Instant.parse("2023-12-31T00:00:00Z"));

    /**
     * The stored shape is a bare, sometimes unclosed ring: every one of the 2,100 dev rows is
     * {@code [[lng,lat],...]} and 80 of them do not repeat the first point (checked 2026-09-08).
     */
    @Test
    void liftsLegacyTablesIntoAValidatedSnapshotWithDerivedParentsAndClosedPolygons() {
        JdbcTemplate jdbc = jdbc(mapping("3110001", "11110515"), area("DISTRICT", "11110", "종로구", RING),
            area("ADMINISTRATION", "11110515", "청운효자동", RING), area("COMMERCIAL", "3110001", "이북5도청사", RING));
        SpatialReleasePort releases = mock(SpatialReleasePort.class);
        when(releases.publish(any())).thenReturn(true);

        var result = new SpatialImportProcessor(new LegacySpatialJdbcSourceAdapter(jdbc, new ObjectMapper(), ""), releases)
            .importSnapshot(REQUEST, false);

        assertThat(result.spatialVersion()).isEqualTo("legacy-20233");
        assertThat(result.areaCount()).isEqualTo(3);
        assertThat(result.published()).isTrue();
        verify(releases).publish(argThat(snapshot -> {
            Map<String, SpatialArea> byCode = new HashMap<>();
            snapshot.areas().forEach(a -> byCode.put(a.areaCode(), a));
            return snapshot.expectedCounts().equals(Map.of(AreaScope.DISTRICT, 1, AreaScope.ADMINISTRATION, 1, AreaScope.COMMERCIAL, 1))
                && byCode.get("11110").parentCode() == null
                && "11110".equals(byCode.get("11110515").parentCode())
                && "11110515".equals(byCode.get("3110001").parentCode())
                // The bare legacy ring becomes a closed GeoJSON Polygon.
                && byCode.get("3110001").boundaryGeoJson().equals(
                    "{\"type\":\"Polygon\",\"coordinates\":[[[126.9,37.5],[127.0,37.5],[127.0,37.6],[126.9,37.6],[126.9,37.5]]]}")
                && snapshot.sourceUpdatedAt().equals(REQUEST.sourceUpdatedAt());
        }));
    }

    @Test
    void checksumIsStableForTheSameTablesAndChangesWhenAnAreaChanges() {
        var adapter = new LegacySpatialJdbcSourceAdapter(jdbc(mapping("3110001", "11110515"), area("DISTRICT", "11110", "종로구", RING),
            area("ADMINISTRATION", "11110515", "청운효자동", RING), area("COMMERCIAL", "3110001", "이북5도청사", RING)), new ObjectMapper(), "");
        SpatialSnapshot first = adapter.read(REQUEST);
        SpatialSnapshot again = adapter.read(REQUEST);
        SpatialSnapshot renamed = new LegacySpatialJdbcSourceAdapter(jdbc(mapping("3110001", "11110515"), area("DISTRICT", "11110", "종로구", RING),
            area("ADMINISTRATION", "11110515", "청운효자동", RING), area("COMMERCIAL", "3110001", "다른이름", RING)), new ObjectMapper(), "").read(REQUEST);
        assertThat(first.checksum()).isEqualTo(again.checksum()).hasSize(64).isNotEqualTo(renamed.checksum());
    }

    @Test
    void commercialAreaWithoutMappingRowFailsClosedNamingTheCode() {
        var adapter = new LegacySpatialJdbcSourceAdapter(jdbc(List.of(), area("DISTRICT", "11110", "종로구", RING),
            area("COMMERCIAL", "3110001", "이북5도청사", RING)), new ObjectMapper(), "");
        assertThatThrownBy(() -> adapter.read(REQUEST)).hasMessageContaining("commercial_region_mapping").hasMessageContaining("3110001");
    }

    @Test
    void projectedOrUnrecognisedBoundariesAreRejected() {
        var projected = new LegacySpatialJdbcSourceAdapter(jdbc(List.of(),
            area("DISTRICT", "11110", "종로구", "[[197093,453418],[197100,453418],[197100,453500],[197093,453418]]")), new ObjectMapper(), "");
        assertThatThrownBy(() -> projected.read(REQUEST)).hasMessageContaining("WGS84 range");
        var unknown = new LegacySpatialJdbcSourceAdapter(jdbc(List.of(), area("DISTRICT", "11110", "종로구", "\"not-geometry\"")), new ObjectMapper(), "");
        assertThatThrownBy(() -> unknown.read(REQUEST)).hasMessageContaining("Unrecognised").hasMessageContaining("11110");
    }

    @Test
    void anAlreadyFormedGeometryObjectIsPassedThroughAfterValidation() {
        String multi = "{\"type\":\"MultiPolygon\",\"coordinates\":[[[[126.9,37.5],[127.0,37.5],[127.0,37.6],[126.9,37.5]]]]}";
        var adapter = new LegacySpatialJdbcSourceAdapter(jdbc(List.of(), area("DISTRICT", "11110", "종로구", multi)), new ObjectMapper(), "");
        assertThat(adapter.read(REQUEST).areas().getFirst().boundaryGeoJson()).isEqualTo(multi);
    }

    @Test
    void refusesGeoJsonRequests() {
        var adapter = new LegacySpatialJdbcSourceAdapter(mock(JdbcTemplate.class), new ObjectMapper(), "");
        assertThatThrownBy(() -> adapter.read(SpatialSourceRequest.geoJson(java.nio.file.Path.of("x.geojson"), "v")))
            .hasMessageContaining("LEGACY");
    }

    /**
     * The legacy tables belong to the district service's schema while facts are written to the commercial
     * one, so an unqualified query reads the wrong database and silently finds nothing.
     */
    @Test
    void qualifiesBothTablesWithTheConfiguredSchema() {
        JdbcTemplate jdbc = jdbc(mapping("3110001", "11110515"), area("DISTRICT", "11110", "종로구", RING),
            area("ADMINISTRATION", "11110515", "청운효자동", RING), area("COMMERCIAL", "3110001", "이북5도청사", RING));
        new LegacySpatialJdbcSourceAdapter(jdbc, new ObjectMapper(), "bosspickseoul_district_dev").read(REQUEST);
        verify(jdbc).queryForList(contains("FROM bosspickseoul_district_dev.commercial_region_mapping"));
        verify(jdbc).queryForList(contains("FROM bosspickseoul_district_dev.area_boundary"));
    }

    @Test
    void anEmptyBoundaryTableNamesTheSchemaSettingInsteadOfPublishingNothing() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForList(anyString())).thenReturn(List.of());
        assertThatThrownBy(() -> new LegacySpatialJdbcSourceAdapter(jdbc, new ObjectMapper(), "wrong_schema").read(REQUEST))
            .hasMessageContaining("wrong_schema.area_boundary").hasMessageContaining("legacy-spatial-schema");
    }

    @Test
    void rejectsASchemaNameThatCouldBeInterpolatedIntoSql() {
        assertThatThrownBy(() -> new LegacySpatialJdbcSourceAdapter(mock(JdbcTemplate.class), new ObjectMapper(), "db; DROP TABLE x"))
            .hasMessageContaining("Invalid legacy spatial schema");
    }

    @SafeVarargs
    private static JdbcTemplate jdbc(List<Map<String, Object>> mappings, Map<String, Object>... areas) {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForList(contains("commercial_region_mapping"))).thenReturn(mappings);
        when(jdbc.queryForList(contains("area_boundary"))).thenReturn(new ArrayList<>(List.of(areas)));
        return jdbc;
    }

    private static List<Map<String, Object>> mapping(String commercial, String administration) {
        return List.of(Map.of("commercial_code", commercial, "administration_code", administration));
    }

    private static Map<String, Object> area(String type, String code, String name, String boundary) {
        return Map.of("area_type", type, "area_code", code, "area_name", name, "boundary_geo_json", boundary);
    }
}

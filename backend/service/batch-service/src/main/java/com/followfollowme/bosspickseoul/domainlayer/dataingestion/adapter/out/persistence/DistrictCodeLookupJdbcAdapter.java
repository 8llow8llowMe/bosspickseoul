package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.DistrictCodeLookupPort;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.AreaScope;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * 공간 스냅샷({@code dataset_spatial_area})의 자치구 이름 → 코드. 사실 적재의 unmapped 검증({@code DatasetReleaseJdbcAdapter})과 같이
 * READY 인 버전의 영역만 본다. 게시 중이거나 실패한 버전의 이름으로 코드를 붙이지 않는다.
 */
public class DistrictCodeLookupJdbcAdapter implements DistrictCodeLookupPort {

    static final String DISTRICT_CODES_SQL = """
        SELECT a.area_code, a.area_name FROM dataset_spatial_area a
        JOIN dataset_spatial_release r ON r.spatial_version=a.spatial_version AND r.status='READY'
        WHERE a.spatial_version=? AND a.area_type=?
        ORDER BY a.area_code
        """;

    private final JdbcTemplate jdbc;

    public DistrictCodeLookupJdbcAdapter(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Map<String, String> districtCodesByName(String spatialVersion) {
        List<String[]> rows = jdbc.query(DISTRICT_CODES_SQL,
            (rs, rowNum) -> new String[] {rs.getString("area_name"), rs.getString("area_code")},
            spatialVersion, AreaScope.DISTRICT.name());
        Map<String, String> codesByName = new LinkedHashMap<>();
        for (String[] row : rows) {
            // 같은 이름이 두 코드에 걸리면 어느 쪽에 붙일지 정할 수 없다. 스냅샷이 잘못된 것이므로 멈춘다.
            if (codesByName.putIfAbsent(row[0], row[1]) != null) {
                throw new IllegalStateException("Duplicate DISTRICT area_name in spatialVersion=" + spatialVersion + ": " + row[0]);
            }
        }
        return Map.copyOf(codesByName);
    }
}

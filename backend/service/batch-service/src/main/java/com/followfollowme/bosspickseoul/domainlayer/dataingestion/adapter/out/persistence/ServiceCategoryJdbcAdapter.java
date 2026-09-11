package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.ServiceCategoryLookupPort;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * commercial-service 가 DDL 을 소유한 {@code service_category} 를 이관용으로 읽기만 한다.
 * {@code service_type} 은 {@code @Enumerated(EnumType.STRING)} 이라 DB 에 enum 이름 문자열로 들어있다.
 */
public class ServiceCategoryJdbcAdapter implements ServiceCategoryLookupPort {

    private final JdbcTemplate jdbc;

    public ServiceCategoryJdbcAdapter(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Map<String, String> serviceTypesByServiceCode() {
        List<String[]> rows = jdbc.query("""
            SELECT service_code, service_type FROM service_category
            WHERE service_code IS NOT NULL AND service_type IS NOT NULL
            """,
            (rs, rowNum) -> new String[] {rs.getString("service_code"), rs.getString("service_type")});
        Map<String, String> serviceTypes = new LinkedHashMap<>();
        for (String[] row : rows) {
            serviceTypes.put(row[0], row[1]);
        }
        return Map.copyOf(serviceTypes);
    }
}

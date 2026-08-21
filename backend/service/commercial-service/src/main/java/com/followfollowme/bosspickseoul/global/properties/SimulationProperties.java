package com.followfollowme.bosspickseoul.global.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 창업 시뮬레이션 기준 데이터 설정.
 * dataBaseYear 는 시뮬레이션 기준 테이블(simulation_rent/simulation_service_type/simulation_franchisee)에서
 * 조회할 활성 기준 연도다. 데이터를 재수집해 새 연도를 적재하면 이 값만 바꿔 전환한다.
 */
@ConfigurationProperties(prefix = "app.simulation")
public record SimulationProperties(String dataBaseYear) {

    private static final String DEFAULT_DATA_BASE_YEAR = "2024";

    public SimulationProperties {
        if (dataBaseYear == null || dataBaseYear.isBlank()) {
            dataBaseYear = DEFAULT_DATA_BASE_YEAR;
        }
    }
}

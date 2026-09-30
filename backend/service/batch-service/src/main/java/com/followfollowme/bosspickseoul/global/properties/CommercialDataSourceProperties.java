package com.followfollowme.bosspickseoul.global.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * commercial 스키마 접속 정보. 정책 수집·분기 적재 자동 최신화·스테이징 정리가 함께 쓴다.
 *
 * <p>상시 컨테이너의 기본 DataSource({@code BATCH_DB_URL})는 district 를 유지하고, commercial 을 쓰는
 * Job 이 하나라도 켜지면 이 값으로 두 번째 커넥션 풀을 연다. 풀을 여는 조건과 URL 필수 검증은
 * {@code CommercialDataSourceConfig} 가 갖는다. 켜진 Job 목록을 이 record 가 알 수 없기 때문이다.
 */
@ConfigurationProperties(prefix = "batch.commercial.datasource")
public record CommercialDataSourceProperties(
    String url,
    String username,
    String password,
    String driverClassName
) {

    private static final String DEFAULT_DRIVER = "com.mysql.cj.jdbc.Driver";

    public CommercialDataSourceProperties {
        if (url == null) {
            url = "";
        }
        if (username == null) {
            username = "";
        }
        if (password == null) {
            password = "";
        }
        if (driverClassName == null || driverClassName.isBlank()) {
            driverClassName = DEFAULT_DRIVER;
        }
    }

    public boolean hasUrl() {
        return !url.isBlank();
    }
}

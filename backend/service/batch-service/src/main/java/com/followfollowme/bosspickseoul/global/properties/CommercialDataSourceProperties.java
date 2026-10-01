package com.followfollowme.bosspickseoul.global.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * commercial 스키마 접속 정보. 정책 수집·분기 적재 자동 최신화·스테이징 정리가 함께 쓴다.
 *
 * <p>상시 컨테이너의 기본 DataSource({@code BATCH_DB_URL})는 district 를 유지하고, commercial 을 쓰는
 * Job 이 하나라도 켜지면 이 값으로 두 번째 커넥션 풀을 연다. 풀을 여는 조건과 URL 필수 검증은
 * {@code CommercialDataSourceConfig} 가 갖는다. 켜진 Job 목록을 이 record 가 알 수 없기 때문이다.
 *
 * @param maximumPoolSize 두 번째 풀 상한. 상시 Job 은 Quartz 스레드 2개 안에서 순차로 돌아 커넥션을 많이 쓰지 않는다.
 *                        DB 서버의 연결 수를 다른 서비스와 나눠 쓰므로 작게 둔다
 * @param minimumIdle     평소 유지할 유휴 커넥션 수. 비우면 1(하루 몇 번 도는 Job 이라 1 이면 된다). 0 은 유휴 커넥션을 두지 않는다
 * @param poolName        Hikari 풀 이름. 로그와 {@code hikaricp_*{pool=...}} 메트릭에서 기본 풀과 구분한다
 */
@ConfigurationProperties(prefix = "batch.commercial.datasource")
public record CommercialDataSourceProperties(
    String url,
    String username,
    String password,
    String driverClassName,
    int maximumPoolSize,
    Integer minimumIdle,
    String poolName
) {

    private static final String DEFAULT_DRIVER = "com.mysql.cj.jdbc.Driver";
    private static final int DEFAULT_MAXIMUM_POOL_SIZE = 4;
    private static final int DEFAULT_MINIMUM_IDLE = 1;
    private static final String DEFAULT_POOL_NAME = "batch-commercial";

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
        if (maximumPoolSize == 0) {
            maximumPoolSize = DEFAULT_MAXIMUM_POOL_SIZE;
        }
        // 0 은 "유휴 커넥션을 두지 않는다" 는 유효한 값이라, 비어 있을 때만 기본값 1 을 쓴다.
        if (minimumIdle == null) {
            minimumIdle = DEFAULT_MINIMUM_IDLE;
        }
        if (poolName == null || poolName.isBlank()) {
            poolName = DEFAULT_POOL_NAME;
        }
        if (maximumPoolSize < 1 || maximumPoolSize > 20) {
            throw new IllegalArgumentException("batch.commercial.datasource.maximum-pool-size must be 1..20");
        }
        if (minimumIdle < 0 || minimumIdle > maximumPoolSize) {
            throw new IllegalArgumentException("batch.commercial.datasource.minimum-idle must be 0..maximum-pool-size");
        }
    }

    /** 접속 정보만 받는 팩토리(테스트용). 풀 설정은 기본값(4 / 1 / batch-commercial)이다. */
    public static CommercialDataSourceProperties of(String url, String username, String password, String driverClassName) {
        return new CommercialDataSourceProperties(url, username, password, driverClassName, 0, null, null);
    }

    public boolean hasUrl() {
        return !url.isBlank();
    }
}

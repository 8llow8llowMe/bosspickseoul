package com.followfollowme.bosspickseoul.global.properties;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 분기 적재 배치가 게시한 {@code dataset_fact} 를 읽는 경로의 설정.
 *
 * <ul>
 *   <li>{@code readEnabled} — false(기본)면 모든 조회가 레거시 팩트 테이블로 간다. true 여도 슬롯에 활성 release 가
 *       없는 분기는 레거시로 간다.</li>
 *   <li>{@code spatialVersion} / {@code schemaVersion} — 활성 release 를 찾는 슬롯의 나머지 두 축. 서비스는 배포 단위로
 *       하나의 폴리곤 기준만 운영하므로 요청 파라미터가 아니라 설정값이다. 새 공간 버전으로 팩트를 재게시한 뒤 이 값만
 *       바꿔 전환한다.</li>
 *   <li>{@code readFromPeriod} — 이 분기(포함)부터만 데이터셋 경로를 쓴다. 백필로 2021~2023 분기가 dataset_fact 에도
 *       생겼을 때 과거 화면이 조용히 바뀌는 것을 막는다.</li>
 *   <li>{@code resolverCacheTtl} — 슬롯 → run_id 캐시 유지 시간. 게시는 분기당 한 번이므로 stale 상한만 있으면 된다.</li>
 * </ul>
 */
@ConfigurationProperties(prefix = "app.dataset")
public record DatasetReadProperties(
    boolean readEnabled,
    String spatialVersion,
    String schemaVersion,
    String readFromPeriod,
    Duration resolverCacheTtl
) {

    private static final String DEFAULT_SPATIAL_VERSION = "legacy-20233";
    private static final String DEFAULT_SCHEMA_VERSION = "seoul-v1";
    private static final String DEFAULT_READ_FROM_PERIOD = "20241";
    private static final Duration DEFAULT_RESOLVER_CACHE_TTL = Duration.ofSeconds(60);

    public DatasetReadProperties {
        spatialVersion = defaultIfBlank(spatialVersion, DEFAULT_SPATIAL_VERSION);
        schemaVersion = defaultIfBlank(schemaVersion, DEFAULT_SCHEMA_VERSION);
        readFromPeriod = defaultIfBlank(readFromPeriod, DEFAULT_READ_FROM_PERIOD);
        if (!readFromPeriod.matches("\\d{4}[1-4]")) {
            throw new IllegalArgumentException("app.dataset.read-from-period must be yyyyQ, e.g. 20241");
        }
        if (resolverCacheTtl == null || resolverCacheTtl.isNegative()) {
            resolverCacheTtl = DEFAULT_RESOLVER_CACHE_TTL;
        }
    }

    private static String defaultIfBlank(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}

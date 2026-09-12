package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.cache;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.DistrictAiReportSnapshot;
import com.followfollowme.bosspickseoul.global.properties.AiReportCacheProperties;
import com.followfollowme.bosspickseoul.redis.properties.RedisProperties;
import java.util.List;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

/**
 * AI 리포트 캐시 키 4종의 모양(버전 세그먼트 포함)을 고정하는 테스트.
 *
 * <p>키 빌더는 private 이므로 가시성을 열지 않고 어댑터의 public 경로로만 접근한다.
 * {@link StringRedisTemplate} 을 목으로 잡아 Redis 에 실제로 건네진 키를 캡처해 단언한다.
 *
 * <p>기대 키를 상수 {@link AiReportCacheKeyVersion} 으로 조립하지 않고 문자열 리터럴로 박아 둔 것은 의도적이다.
 * 상수를 참조하면 버전이 바뀌어도 테스트가 같이 따라가서 아무것도 못 잡는다. 버전을 올리면 이 테스트가 깨져야 하고,
 * 깨진 테스트를 고치는 행위가 "무효화를 의도했다" 는 확인 절차가 된다.
 *
 * <p>저장 값(JSON)의 계약은 {@code AiReportRedisGoldenJsonTest} 가 따로 고정한다. 여기서는 키만 본다.
 */
@ExtendWith(MockitoExtension.class)
class RedisAiReportCacheAdapterKeyTest {

    private static final String KEY_PREFIX = "bosspickseoul:test";
    private static final long TTL_SECONDS = 86_400L;

    @Mock
    private StringRedisTemplate stringRedisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    private RedisAiReportCacheAdapter adapter;

    @BeforeEach
    void setUp() {
        adapter = new RedisAiReportCacheAdapter(
            stringRedisTemplate,
            new RedisProperties(null, null, null, null, null, null, KEY_PREFIX),
            new AiReportCacheProperties(TTL_SECONDS),
            new ObjectMapper()
        );
        when(stringRedisTemplate.opsForValue()).thenReturn(valueOperations);
    }

    @Test
    @DisplayName("상권 리포트 캐시 키는 v2 세그먼트를 유지한다")
    void commercialKeyShapeIsFixed() {
        adapter.getCommercialReport("3110001", "CS100001", "2024Q4");

        assertThat(capturedReadKey()).isEqualTo("bosspickseoul:test:ai:report:commercial:v2:3110001:CS100001:2024Q4");
    }

    @Test
    @DisplayName("상권 비교 리포트 캐시 키는 v1 세그먼트를 유지한다")
    void commercialComparisonKeyShapeIsFixed() {
        adapter.getCommercialComparisonReport("3110001", "3110002", "CS100001", "2024Q4");

        assertThat(capturedReadKey())
            .isEqualTo("bosspickseoul:test:ai:report:commercial-comparison:v1:3110001:3110002:CS100001:2024Q4");
    }

    @Test
    @DisplayName("자치구 리포트 캐시 키는 v1 세그먼트를 가진다")
    void districtKeyShapeIsFixed() {
        adapter.getDistrictReport("11680", "2024Q4");

        assertThat(capturedReadKey()).isEqualTo("bosspickseoul:test:ai:report:district:v1:11680:2024Q4");
    }

    @Test
    @DisplayName("행정동 리포트 캐시 키는 v1 세그먼트를 가진다")
    void administrationKeyShapeIsFixed() {
        adapter.getAdministrationReport("11680640", "2024Q4");

        assertThat(capturedReadKey()).isEqualTo("bosspickseoul:test:ai:report:administration:v1:11680640:2024Q4");
    }

    @Test
    @DisplayName("저장 경로도 조회와 같은 키를 쓰고 설정된 TTL 을 적용한다")
    void saveUsesSameKeyAndConfiguredTtl() {
        DistrictAiReportSnapshot snapshot = new DistrictAiReportSnapshot(
            "강남구 요약", "성장", List.of("커피전문점"), List.of("노래방"), "오피스 수요 중심", null
        );

        adapter.saveDistrictReport("11680", "2024Q4", snapshot);

        verify(valueOperations).set(
            eq("bosspickseoul:test:ai:report:district:v1:11680:2024Q4"), anyString(), eq(TTL_SECONDS), eq(TimeUnit.SECONDS)
        );
    }

    private String capturedReadKey() {
        ArgumentCaptor<String> keyCaptor = ArgumentCaptor.forClass(String.class);
        verify(valueOperations).get(keyCaptor.capture());
        return keyCaptor.getValue();
    }
}

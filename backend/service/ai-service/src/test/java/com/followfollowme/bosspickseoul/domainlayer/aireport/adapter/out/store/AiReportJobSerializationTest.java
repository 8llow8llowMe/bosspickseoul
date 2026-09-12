package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.store;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiReportJob;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiReportJobStatus;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiReportJobType;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.CommercialAiReportSnapshot;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.jackson.JacksonAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class AiReportJobSerializationTest {

    // 운영에 실제로 주입되는 ObjectMapper 빈을 그대로 꺼내 쓴다 (AiReportRedisGoldenJsonTest 와 동일한 방식).
    // Jackson2ObjectMapperBuilder.json().build() 로 직접 만들면 부트의 커스터마이저가 빠져
    // WRITE_DATES_AS_TIMESTAMPS 가 살아 있고 날짜가 숫자/배열로 나간다 — 라운드트립이라 통과는 하지만
    // "부트 자동 구성과 동일" 이라는 전제가 사실이 아니게 된다.
    private static final ObjectMapper OBJECT_MAPPER = autoConfiguredObjectMapper();

    private static ObjectMapper autoConfiguredObjectMapper() {
        AtomicReference<ObjectMapper> holder = new AtomicReference<>();
        new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(JacksonAutoConfiguration.class))
            .run(context -> holder.set(context.getBean(ObjectMapper.class)));
        return holder.get();
    }

    private final ObjectMapper objectMapper = OBJECT_MAPPER;

    @Test
    void aiReportJob_withJavaTimeAndNestedReport_roundTripsAsJsonString() throws Exception {
        CommercialAiReportSnapshot report = new CommercialAiReportSnapshot(
            "요약", List.of("강점"), List.of("리스크"), List.of("추천업종"), List.of("고객층"),
            List.of("운영시간"), List.of("회피시간"), List.of("연령대"), List.of("성별"), List.of("팁"),
            "인사이트", LocalDateTime.of(2026, 8, 4, 13, 39, 45)
        );
        AiReportJob job = AiReportJob.builder()
            .jobId("job-1")
            .memberId(10L)
            .jobType(AiReportJobType.COMMERCIAL)
            .requestHash("hash")
            .requestParams(Map.of("commercialCode", "1000001"))
            .status(AiReportJobStatus.COMPLETED)
            .createdAt(Instant.parse("2026-08-04T04:39:45Z"))
            .startedAt(Instant.parse("2026-08-04T04:39:46Z"))
            .completedAt(Instant.parse("2026-08-04T04:40:00Z"))
            .commercialReport(report)
            .build();

        String json = objectMapper.writeValueAsString(job);
        AiReportJob restored = objectMapper.readValue(json, AiReportJob.class);

        assertThat(restored).isEqualTo(job);
    }
}

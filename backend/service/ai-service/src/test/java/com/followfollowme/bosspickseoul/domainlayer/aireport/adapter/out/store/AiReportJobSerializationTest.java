package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.store;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.info.CommercialAiReportInfo;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiReportJob;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiReportJobStatus;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiReportJobType;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;

class AiReportJobSerializationTest {

    // 스프링 부트 자동 구성과 동일하게 jsr310 등 well-known 모듈이 등록된 ObjectMapper
    private final ObjectMapper objectMapper = Jackson2ObjectMapperBuilder.json().build();

    @Test
    void aiReportJob_withJavaTimeAndNestedReport_roundTripsAsJsonString() throws Exception {
        CommercialAiReportInfo report = new CommercialAiReportInfo(
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

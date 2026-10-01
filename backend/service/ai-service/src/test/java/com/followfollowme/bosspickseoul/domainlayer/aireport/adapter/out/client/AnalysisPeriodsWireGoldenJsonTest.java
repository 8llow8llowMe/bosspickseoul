package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.common.dto.Response;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.AnalysisPeriodsClientResponse;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.jackson.JacksonAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

/**
 * commercial-service {@code GET /api/v1/commercials/periods} 응답과 {@link AnalysisPeriodsClientResponse} 의 역직렬화 계약(이슈 #464).
 *
 * <p>{@code CommercialAnalysisWireGoldenJsonTest} 와 같은 원칙이다. 리터럴은 commercial-service 의 {@code AnalysisPeriodsResponse}·
 * {@code AnalysisDatasetPeriodItem} 필드명에서 손으로 유도했고, 매퍼는 Feign 디코딩 경로와 같은 Boot 자동 설정 매퍼다.
 * ai-service 가 쓰지 않는 {@code firstPeriodCode}·{@code datasets} 는 그대로 무시돼야 한다. 깨지면 리터럴을 고치지 말고
 * peer 계약이 바뀌었는지 먼저 확인한다 — {@code defaultPeriodCode} 를 못 읽으면 분기를 생략한 제출이 전부 503 이 된다.
 */
class AnalysisPeriodsWireGoldenJsonTest {

    private static final ObjectMapper OBJECT_MAPPER = autoConfiguredObjectMapper();

    // GET /api/v1/commercials/periods -> Response<AnalysisPeriodsResponse>
    private static final String PERIODS_GOLDEN_JSON = """
        {
          "dataHeader": { "success": true, "resultCode": null, "resultMessage": null },
          "dataBody": {
            "defaultPeriodCode": "20261",
            "availablePeriodCodes": ["20261", "20254", "20211"],
            "firstPeriodCode": "20211",
            "spatialVersion": "legacy-20233",
            "resolvedAt": "2026-10-01T05:12:03+09:00",
            "datasets": [
              {
                "dataset": "SALES_COMMERCIAL",
                "sourceId": "VwsmTrdarSelngQq",
                "latestPeriodCode": "20262",
                "firstPeriodCode": "20211",
                "periodCount": 22,
                "coreForDefault": true,
                "lastPublishablePeriodCode": null,
                "publishedAt": null,
                "schemaVersion": null
              }
            ]
          }
        }
        """;

    // 핵심 데이터셋 공통 분기가 없을 때 commercial-service 는 200 + defaultPeriodCode null 을 준다.
    private static final String NO_DEFAULT_GOLDEN_JSON = """
        {
          "dataHeader": { "success": true, "resultCode": null, "resultMessage": null },
          "dataBody": {
            "defaultPeriodCode": null,
            "availablePeriodCodes": [],
            "firstPeriodCode": null,
            "spatialVersion": "legacy-20233",
            "resolvedAt": "2026-10-01T05:12:03+09:00",
            "datasets": []
          }
        }
        """;

    private static ObjectMapper autoConfiguredObjectMapper() {
        AtomicReference<ObjectMapper> holder = new AtomicReference<>();
        new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(JacksonAutoConfiguration.class))
            .run(context -> holder.set(context.getBean(ObjectMapper.class)));
        return holder.get();
    }

    @Test
    @DisplayName("기본 분기·가용 분기·공간 스냅샷·계산 시각을 읽고 나머지 필드는 무시한다")
    void readsTheFieldsAiServiceUses() throws Exception {
        Response<AnalysisPeriodsClientResponse> response = OBJECT_MAPPER.readValue(PERIODS_GOLDEN_JSON, new TypeReference<>() {});

        AnalysisPeriodsClientResponse body = response.dataBody();
        assertThat(response.dataHeader().success()).isTrue();
        assertThat(body.defaultPeriodCode()).isEqualTo("20261");
        assertThat(body.availablePeriodCodes()).containsExactly("20261", "20254", "20211");
        assertThat(body.spatialVersion()).isEqualTo("legacy-20233");
        assertThat(body.resolvedAt()).isEqualTo("2026-10-01T05:12:03+09:00");
    }

    @Test
    @DisplayName("기본 분기가 null 이면 null 로 읽혀 어댑터가 AI_013 으로 처리한다")
    void readsANullDefault() throws Exception {
        Response<AnalysisPeriodsClientResponse> response = OBJECT_MAPPER.readValue(NO_DEFAULT_GOLDEN_JSON, new TypeReference<>() {});

        assertThat(response.dataBody().defaultPeriodCode()).isNull();
        assertThat(response.dataBody().availablePeriodCodes()).isEmpty();
    }
}

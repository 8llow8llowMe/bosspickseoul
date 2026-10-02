package com.followfollowme.bosspickseoul.domainlayer.map.adapter.out.client;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.common.dto.Response;
import com.followfollowme.bosspickseoul.domainlayer.map.adapter.out.client.feign.dto.AnalysisPeriodsClientResponse;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.jackson.JacksonAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

/**
 * commercial-service {@code GET /api/v1/commercials/periods} 응답과 지도의 wire DTO 사이 역직렬화 계약(이슈 #464).
 *
 * <p>리터럴은 commercial-service 의 {@code AnalysisPeriodsResponse}·{@code AnalysisDatasetPeriodItem} 필드명에서 손으로 유도했다. 매퍼는 Feign
 * 디코딩 경로와 같은 Boot 자동 설정 매퍼다(알 수 없는 필드는 무시). 필드명 {@code defaultPeriodCode} 가 어긋나면 값이 조용히 null 이
 * 돼 분기를 생략한 지도 요청이 전부 MAP_011(503) 이 되므로, 깨지면 리터럴이 아니라 peer 계약을 먼저 확인한다.
 */
class AnalysisPeriodsWireJsonTest {

    private static final ObjectMapper OBJECT_MAPPER = autoConfiguredObjectMapper();

    // GET /api/v1/commercials/periods -> Response<AnalysisPeriodsResponse>
    private static final String PERIODS_JSON = """
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

    private static ObjectMapper autoConfiguredObjectMapper() {
        AtomicReference<ObjectMapper> holder = new AtomicReference<>();
        new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(JacksonAutoConfiguration.class))
            .run(context -> holder.set(context.getBean(ObjectMapper.class)));
        return holder.get();
    }

    @Test
    @DisplayName("defaultPeriodCode 를 읽고 지도가 쓰지 않는 필드는 무시한다")
    void readsTheDefaultPeriodCode() throws Exception {
        Response<AnalysisPeriodsClientResponse> response = OBJECT_MAPPER.readValue(PERIODS_JSON, new TypeReference<>() {});

        assertThat(response.dataHeader().success()).isTrue();
        assertThat(response.dataBody().defaultPeriodCode()).isEqualTo("20261");
    }
}

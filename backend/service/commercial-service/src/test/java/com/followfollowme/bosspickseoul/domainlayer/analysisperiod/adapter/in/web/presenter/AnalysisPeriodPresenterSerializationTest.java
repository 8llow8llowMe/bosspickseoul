package com.followfollowme.bosspickseoul.domainlayer.analysisperiod.adapter.in.web.presenter;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.model.AnalysisPeriodCatalog;
import com.followfollowme.bosspickseoul.shared.enums.DatasetKey;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;

/**
 * {@code GET /api/v1/commercials/periods} 의 wire format 을 못 박는다(이슈 #464).
 *
 * <p>FE·ai-service 가 이 모양을 그대로 읽는다. 게시 시각·스키마 버전은 아직 null 이지만 키는 미리 내려 둬 후속 이슈가
 * 값만 채우게 한다. ObjectMapper 는 Boot 자동 설정과 같게 날짜를 숫자가 아닌 ISO 문자열로 쓴다
 * ({@code JacksonAutoConfiguration} 이 {@code WRITE_DATES_AS_TIMESTAMPS} 를 끈다).
 */
class AnalysisPeriodPresenterSerializationTest {

    private final AnalysisPeriodPresenter presenter = new AnalysisPeriodPresenter();
    private final ObjectMapper objectMapper = Jackson2ObjectMapperBuilder.json()
        .featuresToDisable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
        .build();

    @Test
    @DisplayName("카탈로그 필드와 데이터셋 항목이 계약한 이름·값으로 직렬화된다")
    void serializesTheCatalogContract() throws Exception {
        Map<DatasetKey, Set<String>> periods = new EnumMap<>(DatasetKey.class);
        for (DatasetKey dataset : DatasetKey.values()) {
            periods.put(dataset, Set.of("20211", "20254", "20261"));
        }
        periods.put(DatasetKey.SALES_COMMERCIAL, Set.of("20211", "20254", "20261", "20262"));
        periods.put(DatasetKey.CONSUMPTION_COMMERCIAL, Set.of("20211", "20234"));
        AnalysisPeriodCatalog catalog = AnalysisPeriodCatalog.of("test-snapshot", periods, OffsetDateTime.parse("2026-10-01T05:12:03+09:00"));

        JsonNode json = objectMapper.readTree(objectMapper.writeValueAsString(presenter.toAnalysisPeriodsResponse(catalog)));

        assertThat(json.get("defaultPeriodCode").asText()).isEqualTo("20261");
        assertThat(json.get("availablePeriodCodes")).extracting(JsonNode::asText).containsExactly("20261", "20254", "20211");
        assertThat(json.get("firstPeriodCode").asText()).isEqualTo("20211");
        assertThat(json.get("spatialVersion").asText()).isEqualTo("test-snapshot");
        assertThat(json.get("resolvedAt").asText()).isEqualTo("2026-10-01T05:12:03+09:00");
        assertThat(json.get("datasets")).hasSize(DatasetKey.values().length);

        JsonNode sales = json.get("datasets").get(0);
        assertThat(fieldNames(sales)).containsExactly("dataset", "sourceId", "latestPeriodCode", "firstPeriodCode", "periodCount",
            "coreForDefault", "lastPublishablePeriodCode", "publishedAt", "schemaVersion");
        assertThat(sales.get("dataset").asText()).isEqualTo("SALES_COMMERCIAL");
        assertThat(sales.get("sourceId").asText()).isEqualTo(DatasetKey.SALES_COMMERCIAL.openApiService());
        assertThat(sales.get("latestPeriodCode").asText()).isEqualTo("20262");
        assertThat(sales.get("periodCount").asInt()).isEqualTo(4);
        assertThat(sales.get("coreForDefault").asBoolean()).isTrue();
        assertThat(sales.get("lastPublishablePeriodCode").isNull()).isTrue();
        assertThat(sales.get("publishedAt").isNull()).isTrue();
        assertThat(sales.get("schemaVersion").isNull()).isTrue();

        JsonNode consumption = json.get("datasets").get(DatasetKey.CONSUMPTION_COMMERCIAL.ordinal());
        assertThat(consumption.get("dataset").asText()).isEqualTo("CONSUMPTION_COMMERCIAL");
        assertThat(consumption.get("coreForDefault").asBoolean()).isFalse();
        assertThat(consumption.get("lastPublishablePeriodCode").asText()).isEqualTo("20234");
    }

    @Test
    @DisplayName("기본 분기를 정할 수 없으면 null 과 빈 목록으로 내려간다")
    void emptyCatalogSerializesNullDefaultAndEmptyList() throws Exception {
        AnalysisPeriodCatalog catalog = AnalysisPeriodCatalog.of("test-snapshot", Map.of(), OffsetDateTime.parse("2026-10-01T05:12:03+09:00"));

        JsonNode json = objectMapper.readTree(objectMapper.writeValueAsString(presenter.toAnalysisPeriodsResponse(catalog)));

        assertThat(json.get("defaultPeriodCode").isNull()).isTrue();
        assertThat(json.get("firstPeriodCode").isNull()).isTrue();
        assertThat(json.get("availablePeriodCodes")).isEmpty();
    }

    private static List<String> fieldNames(JsonNode node) {
        List<String> names = new ArrayList<>();
        node.fieldNames().forEachRemaining(names::add);
        return names;
    }
}

package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.presenter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.comparison.CommercialComparisonInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.comparison.CommercialComparisonTargetInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.comparison.ComparisonGuideInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.comparison.ComparisonMetricGroupGuideInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.comparison.ComparisonMetricInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.preview.CommercialComparePreviewInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.model.ComparisonWinnerSide;
import com.followfollowme.bosspickseoul.domainlayer.policy.adapter.in.web.presenter.PolicyPresenter;
import java.util.List;
import org.junit.jupiter.api.Test;

class CommercialComparisonPresenterSerializationTest {

    private static final List<String> METRIC_GROUPS = List.of(
        "salesMetrics", "footTrafficMetrics", "storeMetrics", "spendingMetrics", "residentPopulationMetrics", "facilityMetrics",
        "salesTimeSlotMetrics", "salesAgeMetrics", "salesAgeGenderMetrics", "footTrafficTimeSlotMetrics", "footTrafficAgeMetrics",
        "footTrafficAgeGenderMetrics"
    );

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final CommercialPresenter presenter = new CommercialPresenter(mock(PolicyPresenter.class));

    @Test
    void fullComparisonJsonIncludesGuideAndMetricMetadataForEveryGroup() {
        ComparisonMetricInfo metric = percentageMetric();
        CommercialComparisonInfo info = CommercialComparisonInfo.builder()
            .left(target("left", "왼쪽 상권"))
            .right(target("right", "오른쪽 상권"))
            .periodCode("20233")
            .serviceCode("CS100001")
            .comparisonGuide(guide())
            .salesMetrics(List.of(metric))
            .footTrafficMetrics(List.of(metric))
            .storeMetrics(List.of(metric))
            .spendingMetrics(List.of(metric))
            .residentPopulationMetrics(List.of(metric))
            .facilityMetrics(List.of(metric))
            .salesTimeSlotMetrics(List.of(metric))
            .salesAgeMetrics(List.of(metric))
            .salesAgeGenderMetrics(List.of(metric))
            .footTrafficTimeSlotMetrics(List.of(metric))
            .footTrafficAgeMetrics(List.of(metric))
            .footTrafficAgeGenderMetrics(List.of(metric))
            .build();

        JsonNode json = objectMapper.valueToTree(presenter.toCommercialComparisonResponse(info));

        assertThat(json.path("periodCode").asText()).isEqualTo("20233");
        assertThat(json.path("serviceCode").asText()).isEqualTo("CS100001");
        assertThat(json.path("comparisonGuide").path("differenceBasis").asText()).contains("왼쪽 상권 값", "오른쪽 상권 값");
        assertThat(json.path("comparisonGuide").path("metricGroups").get(0).path("code").asText()).isEqualTo("salesMetrics");
        for (String group : METRIC_GROUPS) {
            JsonNode item = json.path(group).get(0);
            assertThat(item.path("leftValue").asDouble()).isEqualTo(53.8D);
            assertThat(item.path("rightValue").asDouble()).isEqualTo(52.9D);
            assertThat(item.path("diffValue").asDouble()).isEqualTo(0.9D);
            assertThat(item.path("diffRate").asDouble()).isEqualTo(1.7D);
            assertThat(item.path("unit").asText()).isEqualTo("%");
            assertThat(item.path("displayPrecision").asInt()).isEqualTo(1);
            assertThat(item.path("differenceUnit").asText()).isEqualTo("%p");
            assertThat(item.path("description").asText()).isNotBlank();
        }
    }

    @Test
    void previewJsonUsesTheSameMetricMetadataContract() {
        CommercialComparePreviewInfo info = CommercialComparePreviewInfo.builder()
            .left(target("left", "왼쪽 상권"))
            .right(target("right", "오른쪽 상권"))
            .recommendedSide(ComparisonWinnerSide.LEFT.toMetadata())
            .headlineMetrics(List.of(percentageMetric()))
            .insightOneLiner("요약")
            .build();

        JsonNode item = objectMapper.valueToTree(presenter.toCommercialComparePreviewResponse(info)).path("headlineMetrics").get(0);

        assertThat(item.path("unit").asText()).isEqualTo("%");
        assertThat(item.path("differenceUnit").asText()).isEqualTo("%p");
        assertThat(item.path("description").asText()).isNotBlank();
    }

    private ComparisonGuideInfo guide() {
        return ComparisonGuideInfo.builder()
            .differenceBasis("차이는 왼쪽 상권 값에서 오른쪽 상권 값을 뺀 값입니다.")
            .metricGroups(List.of(ComparisonMetricGroupGuideInfo.builder()
                .code("salesMetrics")
                .name("매출")
                .description("선택 업종 매출 비교")
                .build()))
            .build();
    }

    private ComparisonMetricInfo percentageMetric() {
        return ComparisonMetricInfo.builder()
            .label("여성 유동인구 비중")
            .leftValue(53.8D)
            .rightValue(52.9D)
            .diffValue(0.9D)
            .diffRate(1.7D)
            .unit("%")
            .displayPrecision(1)
            .differenceUnit("%p")
            .description("선택 분기 상권 전체의 여성 유동인구 비중입니다.")
            .winnerSide(ComparisonWinnerSide.LEFT.toMetadata())
            .build();
    }

    private CommercialComparisonTargetInfo target(String code, String name) {
        return CommercialComparisonTargetInfo.builder().commercialCode(code).commercialName(name).build();
    }
}

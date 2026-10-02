package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.presenter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.comparison.CommercialBenchmarkInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.comparison.CommercialSalesPerStoreSummaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.income.CommercialExpenseProvenanceInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.CommercialIncomeSummaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.CommercialSalesSummaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.RegionalSalesSummaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.policy.adapter.in.web.presenter.PolicyPresenter;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 벤치마크 응답의 {@code salesPerStore} 직렬화 계약을 못 박는다(이슈 #485). 결측은 키를 빼지 않고 JSON null 로 내리고, 0 으로 내리지
 * 않는다. 기존 {@code salesSummary} 는 {@code /summaries/sales} 와 ai-service 가 공유하는 모양이라 필드가 늘지 않아야 한다.
 */
class CommercialBenchmarkPresenterTest {

    private static final String COFFEE = "CS100010";

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final CommercialPresenter presenter = new CommercialPresenter(
        mock(PolicyPresenter.class), new CommercialExpenseProvenancePresenter(), new CommercialIncomeProvenancePresenter());

    @Test
    @DisplayName("점포당 매출과 두 지수를 값 그대로 내려보낸다")
    void carriesSalesPerStoreValues() {
        JsonNode salesPerStore = benchmarkJson(CommercialSalesPerStoreSummaryInfo.of(salesSummary(), 809L, 102L, 20L)).path("salesPerStore");

        assertThat(fieldNames(salesPerStore)).containsExactly(
            "serviceCode", "serviceName", "district", "administration", "commercial", "indexVsDistrict", "indexVsAdministration");
        assertThat(salesPerStore.path("serviceCode").asText()).isEqualTo(COFFEE);
        assertThat(salesPerStore.path("serviceName").asText()).isEqualTo("커피-음료");
        assertThat(salesPerStore.path("indexVsDistrict").isNumber()).isTrue();
        assertThat(salesPerStore.path("indexVsDistrict").asDouble()).isEqualTo(43.3);
        assertThat(salesPerStore.path("indexVsAdministration").asDouble()).isEqualTo(63.4);

        JsonNode commercial = salesPerStore.path("commercial");
        assertThat(fieldNames(commercial)).containsExactly("code", "name", "monthlySalesAmount", "storeCount", "monthlySalesPerStore");
        assertThat(commercial.path("code").asText()).isEqualTo("3110438");
        assertThat(commercial.path("name").asText()).isEqualTo("경춘선숲길 우측");
        assertThat(commercial.path("monthlySalesAmount").asLong()).isEqualTo(164_964_564L);
        assertThat(commercial.path("storeCount").asLong()).isEqualTo(20L);
        assertThat(commercial.path("monthlySalesPerStore").asLong()).isEqualTo(8_248_228L);
        assertThat(salesPerStore.path("district").path("monthlySalesPerStore").asLong()).isEqualTo(19_055_381L);
        assertThat(salesPerStore.path("administration").path("monthlySalesPerStore").asLong()).isEqualTo(13_003_863L);
    }

    @Test
    @DisplayName("점포 행이 없으면 단위는 남기고 점포 수·점포당 매출·지수만 JSON null 로 내린다")
    void keepsMissingStoreValuesAsJsonNull() {
        JsonNode salesPerStore = benchmarkJson(CommercialSalesPerStoreSummaryInfo.of(salesSummary(), 809L, 102L, null)).path("salesPerStore");

        JsonNode commercial = salesPerStore.path("commercial");
        assertThat(commercial.path("code").asText()).isEqualTo("3110438");
        assertThat(commercial.path("monthlySalesAmount").asLong()).isEqualTo(164_964_564L);
        assertThat(commercial.has("storeCount")).isTrue();
        assertThat(commercial.path("storeCount").isNull()).isTrue();
        assertThat(commercial.has("monthlySalesPerStore")).isTrue();
        assertThat(commercial.path("monthlySalesPerStore").isNull()).isTrue();
        assertThat(salesPerStore.has("indexVsDistrict")).isTrue();
        assertThat(salesPerStore.path("indexVsDistrict").isNull()).isTrue();
        assertThat(salesPerStore.path("indexVsAdministration").isNull()).isTrue();
        // 비교 단위 값은 그대로 살아 있다.
        assertThat(salesPerStore.path("district").path("monthlySalesPerStore").asLong()).isEqualTo(19_055_381L);
    }

    @Test
    @DisplayName("기존 salesSummary 의 모양은 바뀌지 않는다")
    void leavesSalesSummaryShapeUntouched() {
        JsonNode json = benchmarkJson(CommercialSalesPerStoreSummaryInfo.of(salesSummary(), 809L, 102L, 20L));

        assertThat(fieldNames(json.path("salesSummary"))).containsExactly("periodCode", "district", "administration", "commercial");
        assertThat(fieldNames(json.path("salesSummary").path("commercial")))
            .containsExactly("code", "name", "serviceCode", "serviceName", "monthlySalesAmount");
        assertThat(json.path("salesSummary").path("commercial").path("monthlySalesAmount").asLong()).isEqualTo(164_964_564L);
        assertThat(fieldNames(json)).contains("salesSummary", "incomeSummary", "salesPerStore", "benchmarkHighlights");
    }

    private JsonNode benchmarkJson(CommercialSalesPerStoreSummaryInfo salesPerStore) {
        return objectMapper.valueToTree(presenter.toCommercialBenchmarkResponse(CommercialBenchmarkInfo.builder()
            .periodCode("20261")
            .commercialCode("3110438")
            .commercialName("경춘선숲길 우측")
            .districtCode("11350")
            .districtName("노원구")
            .administrationCode("11350600")
            .administrationName("공릉2동")
            .summary("요약")
            .salesSummary(salesSummary())
            .incomeSummary(CommercialIncomeSummaryInfo.builder().commercialProvenance(CommercialExpenseProvenanceInfo.unavailable()).build())
            .salesPerStore(salesPerStore)
            .benchmarkHighlights(List.of())
            .build()));
    }

    private static CommercialSalesSummaryInfo salesSummary() {
        return CommercialSalesSummaryInfo.builder()
            .periodCode("20261")
            .district(RegionalSalesSummaryInfo.builder()
                .code("11350").name("노원구").serviceCode(COFFEE).serviceName("커피-음료").monthlySalesAmount(15_415_802_889L).build())
            .administration(RegionalSalesSummaryInfo.builder()
                .code("11350600").name("공릉2동").serviceCode(COFFEE).serviceName("커피-음료").monthlySalesAmount(1_326_394_061L).build())
            .commercial(RegionalSalesSummaryInfo.builder()
                .code("3110438").name("경춘선숲길 우측").serviceCode(COFFEE).serviceName("커피-음료").monthlySalesAmount(164_964_564L).build())
            .build();
    }

    private static List<String> fieldNames(JsonNode node) {
        List<String> names = new ArrayList<>();
        node.fieldNames().forEachRemaining(names::add);
        return names;
    }
}

package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.presenter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.domainlayer.administration.domain.model.IncomeAdministration;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.income.CommercialExpenseProvenanceInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.income.CommercialIncomeAndExpenseInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.CommercialIncomeSummaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.RegionalIncomeSummaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.IncomeCommercial;
import com.followfollowme.bosspickseoul.domainlayer.policy.adapter.in.web.presenter.PolicyPresenter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class CommercialIncomePresenterTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final CommercialPresenter presenter =
        new CommercialPresenter(mock(PolicyPresenter.class), new CommercialExpenseProvenancePresenter());

    @Test
    @DisplayName("지출이 없는 분기는 빈 배열이나 0 이 아니라 JSON null 로 내려가고 중단 사실만 남는다")
    void incomeResponseKeepsMissingExpenseAsJsonNull() {
        JsonNode json = objectMapper.valueToTree(
            presenter.toCommercialIncomeResponse(CommercialIncomeAndExpenseInfo.unavailable()));

        assertThat(json.path("expenseCategories").isNull()).isTrue();
        assertThat(json.path("totalExpenseAmount").isNull()).isTrue();
        // 원천 중단으로 사라진 소득 항목은 응답 계약에서 아예 빠진다.
        assertThat(json.has("averageIncomeItem")).isFalse();
        // 이슈 #415: 값이 없어도 출처는 비우지 않는다.
        assertThat(json.path("provenance").path("scope").path("code").asText()).isEqualTo("UNAVAILABLE");
        assertThat(json.path("provenance").path("scopeCode").isNull()).isTrue();
        assertThat(json.path("provenance").path("disclaimer").asText()).contains("상권 단위 소비 제공을 중단");
    }

    @Test
    @DisplayName("상권 네이티브는 9항목을 순서대로 내려보내고 면책을 비운다")
    void incomeResponseCarriesCommercialScopeExpense() {
        JsonNode json = objectMapper.valueToTree(presenter.toCommercialIncomeResponse(
            CommercialIncomeAndExpenseInfo.from(IncomeCommercial.builder()
                .periodCode("20233")
                .commercialCode("3110008")
                .commercialName("배화여자대학교")
                .groceryExpenseAmount(320_000L)
                .build())));

        assertThat(json.path("expenseCategories")).hasSize(9);
        assertThat(json.path("expenseCategories").get(0).path("key").asText()).isEqualTo("GROCERY");
        assertThat(json.path("expenseCategories").get(0).path("label").asText()).isEqualTo("식료품");
        assertThat(json.path("expenseCategories").get(0).path("amount").asLong()).isEqualTo(320_000L);
        assertThat(json.path("totalExpenseAmount").asLong()).isEqualTo(320_000L);
        assertThat(json.path("provenance").path("scope").path("code").asText()).isEqualTo("COMMERCIAL");
        assertThat(json.path("provenance").path("sourceUrl").asText()).contains("OA-21278");
        assertThat(json.path("provenance").path("disclaimer").isNull()).isTrue();
    }

    @Test
    @DisplayName("행정동 대체는 10항목과 면책 문장을 함께 내려보낸다")
    void incomeResponseCarriesAdministrationProxyExpense() {
        JsonNode json = objectMapper.valueToTree(presenter.toCommercialIncomeResponse(
            CommercialIncomeAndExpenseInfo.ofAdministrationProxy(IncomeAdministration.builder()
                .periodCode("20261")
                .administrationCode("11110515")
                .administrationName("청운효자동")
                .totalExpenseAmount(550L)
                .groceryExpenseAmount(100L).clothingExpenseAmount(90L).householdExpenseAmount(80L)
                .medicalExpenseAmount(70L).transportationExpenseAmount(60L).educationExpenseAmount(50L)
                .entertainmentExpenseAmount(40L).leisureCultureExpenseAmount(30L)
                .otherExpenseAmount(20L).diningExpenseAmount(10L)
                .build())));

        assertThat(json.path("expenseCategories")).hasSize(10);
        assertThat(json.path("expenseCategories").get(7).path("key").asText()).isEqualTo("LEISURE_CULTURE");
        assertThat(json.path("expenseCategories").get(7).path("label").asText()).isEqualTo("여가·문화");
        assertThat(json.path("expenseCategories").get(9).path("key").asText()).isEqualTo("DINING");
        assertThat(json.path("totalExpenseAmount").asLong()).isEqualTo(550L);
        assertThat(json.path("provenance").path("scope").path("code").asText()).isEqualTo("ADMINISTRATION_PROXY");
        assertThat(json.path("provenance").path("scopeCode").asText()).isEqualTo("11110515");
        assertThat(json.path("provenance").path("scopeName").asText()).isEqualTo("청운효자동");
        assertThat(json.path("provenance").path("sourceId").asText()).isEqualTo("VwsmAdstrdNcmCnsmpW");
        assertThat(json.path("provenance").path("sourceUrl").asText()).contains("OA-22166");
        assertThat(json.path("provenance").path("effectivePeriodCode").asText()).isEqualTo("20261");
        assertThat(json.path("provenance").path("disclaimer").asText()).contains("청운효자동");
    }

    @Test
    @DisplayName("지역 지출 요약은 행이 없는 단위만 null 로 비우고 상권 leg 출처를 함께 내려보낸다")
    void incomeSummaryResponseKeepsMissingRegionAsJsonNull() {
        JsonNode json = objectMapper.valueToTree(presenter.toCommercialIncomeSummaryResponse(
            CommercialIncomeSummaryInfo.builder()
                .district(RegionalIncomeSummaryInfo.builder().code("11680").name("강남구").totalExpenseAmount(42L).build())
                .administration(null)
                .commercial(null)
                .commercialProvenance(CommercialExpenseProvenanceInfo.unavailable())
                .build()));

        assertThat(json.path("district").path("totalExpenseAmount").asLong()).isEqualTo(42L);
        assertThat(json.path("administration").isNull()).isTrue();
        assertThat(json.path("commercial").isNull()).isTrue();
        assertThat(json.path("commercialProvenance").path("scope").path("code").asText()).isEqualTo("UNAVAILABLE");
    }
}

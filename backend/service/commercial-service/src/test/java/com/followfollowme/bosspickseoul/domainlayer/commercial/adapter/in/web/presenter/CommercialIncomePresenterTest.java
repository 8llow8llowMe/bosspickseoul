package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.presenter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.domainlayer.administration.domain.model.IncomeAdministration;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.income.CommercialDistrictAverageIncomeInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.income.CommercialExpenseProvenanceInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.income.CommercialIncomeAndExpenseInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.income.CommercialIncomeAndExpenseResponseInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.CommercialIncomeSummaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.RegionalIncomeSummaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.IncomeCommercial;
import com.followfollowme.bosspickseoul.domainlayer.district.domain.model.PensionIncomeDistrict;
import com.followfollowme.bosspickseoul.domainlayer.policy.adapter.in.web.presenter.PolicyPresenter;
import java.time.LocalDate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class CommercialIncomePresenterTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final CommercialPresenter presenter = new CommercialPresenter(
        mock(PolicyPresenter.class), new CommercialExpenseProvenancePresenter(), new CommercialIncomeProvenancePresenter());

    @Test
    @DisplayName("지출이 없는 분기는 빈 배열이나 0 이 아니라 JSON null 로 내려가고 중단 사실만 남는다")
    void incomeResponseKeepsMissingExpenseAsJsonNull() {
        JsonNode json = incomeResponse(CommercialIncomeAndExpenseInfo.unavailable(), CommercialDistrictAverageIncomeInfo.unavailable());

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
        JsonNode json = incomeResponse(
            CommercialIncomeAndExpenseInfo.from(IncomeCommercial.builder()
                .periodCode("20233")
                .commercialCode("3110008")
                .commercialName("배화여자대학교")
                .groceryExpenseAmount(320_000L)
                .build()),
            CommercialDistrictAverageIncomeInfo.unavailable());

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
        JsonNode json = incomeResponse(
            CommercialIncomeAndExpenseInfo.ofAdministrationProxy(IncomeAdministration.builder()
                .periodCode("20261")
                .administrationCode("11110515")
                .administrationName("청운효자동")
                .totalExpenseAmount(550L)
                .groceryExpenseAmount(100L).clothingExpenseAmount(90L).householdExpenseAmount(80L)
                .medicalExpenseAmount(70L).transportationExpenseAmount(60L).educationExpenseAmount(50L)
                .entertainmentExpenseAmount(40L).leisureCultureExpenseAmount(30L)
                .otherExpenseAmount(20L).diningExpenseAmount(10L)
                .build()),
            CommercialDistrictAverageIncomeInfo.unavailable());

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
    @DisplayName("자치구 평균 소득(대체)은 소비 필드와 따로 금액과 출처를 내려보내고, 기준일은 출처 한 곳에만 ISO 날짜로 싣는다")
    void incomeResponseCarriesDistrictAverageIncomeProxy() {
        JsonNode json = incomeResponse(
            CommercialIncomeAndExpenseInfo.unavailable(),
            CommercialDistrictAverageIncomeInfo.from(PensionIncomeDistrict.builder()
                .id(1L)
                .referenceDate(LocalDate.of(2024, 12, 31))
                .districtCode("11110")
                .districtName("종로구")
                .averageMonthlyIncomeAmount(1_555_244L)
                .build()));

        JsonNode income = json.path("districtAverageIncome");
        assertThat(income.path("amount").asLong()).isEqualTo(1_555_244L);
        assertThat(income.path("provenance").path("scope").path("code").asText()).isEqualTo("DISTRICT_PROXY");
        assertThat(income.path("provenance").path("scope").path("name").asText()).isEqualTo("자치구 대체");
        assertThat(income.path("provenance").path("scopeCode").asText()).isEqualTo("11110");
        assertThat(income.path("provenance").path("scopeName").asText()).isEqualTo("종로구");
        assertThat(income.path("provenance").path("sourceId").asText()).isEqualTo("data.go.kr:3046077");
        assertThat(income.path("provenance").path("sourceLabel").asText()).isEqualTo("국민연금공단 자격 시군구 신고 평균소득월액");
        assertThat(income.path("provenance").path("sourceUrl").asText()).isEqualTo("https://www.data.go.kr/data/3046077/fileData.do");
        assertThat(income.path("provenance").path("referenceDate").asText()).isEqualTo("2024-12-31");
        assertThat(income.path("provenance").path("disclaimer").asText())
            .contains("종로구 평균입니다(기준일 2024-12-31)", "같은 자치구 안의 상권은 모두 같은 값");
        // 기준일은 출처 한 곳에만 둔다. 소비 출처의 effectivePeriodCode 와 같은 자리다.
        assertThat(json.has("referenceDate")).isFalse();
        assertThat(income.has("referenceDate")).isFalse();
        // 소비 쪽 계약은 소득이 붙어도 그대로다.
        assertThat(json.path("provenance").path("scope").path("code").asText()).isEqualTo("UNAVAILABLE");
        assertThat(json.has("averageIncomeItem")).isFalse();
    }

    @Test
    @DisplayName("쓸 수 있는 자치구 평균 소득이 없으면 필드를 빼지 않고 amount 만 JSON null 로 두고 사유를 남긴다")
    void incomeResponseKeepsMissingDistrictAverageIncomeAsJsonNull() {
        JsonNode json = incomeResponse(CommercialIncomeAndExpenseInfo.unavailable(), CommercialDistrictAverageIncomeInfo.unavailable());

        JsonNode income = json.path("districtAverageIncome");
        assertThat(json.has("districtAverageIncome")).isTrue();
        assertThat(income.has("amount")).isTrue();
        assertThat(income.path("amount").isNull()).isTrue();
        assertThat(income.path("provenance").path("scope").path("code").asText()).isEqualTo("UNAVAILABLE");
        assertThat(income.path("provenance").path("scopeCode").isNull()).isTrue();
        assertThat(income.path("provenance").path("scopeName").isNull()).isTrue();
        assertThat(income.path("provenance").path("referenceDate").isNull()).isTrue();
        // 값이 없어도 어느 원천을 찾았는지는 알린다.
        assertThat(income.path("provenance").path("sourceId").asText()).isEqualTo("data.go.kr:3046077");
        assertThat(income.path("provenance").path("disclaimer").asText())
            .isEqualTo("이 분기에 쓸 수 있는 자치구 평균 소득 자료가 없어 소득 지표를 제공하지 않습니다.");
        assertThat(json.has("averageIncomeItem")).isFalse();
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

    @Test
    @DisplayName("상권 소비 행이 없는 대체 구간에서는 상권 leg 의 name 이 JSON null 로 내려간다")
    void incomeSummaryResponseKeepsCommercialNameNullWhenOnlyTheProxyValueExists() {
        // 2024년 이후 1,650곳 중 560곳은 income_commercial 행 자체가 없어 이름을 가져올 곳이 없다.
        // 예외가 아니라 주요 경로이므로 응답 계약(@Schema nullable)과 함께 여기서 못 박는다. (이슈 #415)
        JsonNode json = objectMapper.valueToTree(presenter.toCommercialIncomeSummaryResponse(
            CommercialIncomeSummaryInfo.builder()
                .district(RegionalIncomeSummaryInfo.builder().code("11110").name("종로구").totalExpenseAmount(9_000L).build())
                .administration(RegionalIncomeSummaryInfo.builder()
                    .code("11110515").name("청운효자동").totalExpenseAmount(550L).build())
                .commercial(RegionalIncomeSummaryInfo.builder().code("3110008").name(null).totalExpenseAmount(550L).build())
                .commercialProvenance(CommercialExpenseProvenanceInfo.ofAdministrationProxy("20261", "11110515", "청운효자동"))
                .build()));

        assertThat(json.path("commercial").path("code").asText()).isEqualTo("3110008");
        assertThat(json.path("commercial").path("name").isNull()).isTrue();
        // 값 자체는 살아 있고, 어디서 왔는지는 출처가 말한다. 이름만 비어 있는 것이 계약이다.
        assertThat(json.path("commercial").path("totalExpenseAmount").asLong()).isEqualTo(550L);
        assertThat(json.path("commercialProvenance").path("scope").path("code").asText()).isEqualTo("ADMINISTRATION_PROXY");
        assertThat(json.path("commercialProvenance").path("scopeName").asText()).isEqualTo("청운효자동");
    }

    private JsonNode incomeResponse(CommercialIncomeAndExpenseInfo expense, CommercialDistrictAverageIncomeInfo districtAverageIncome) {
        return objectMapper.valueToTree(presenter.toCommercialIncomeResponse(CommercialIncomeAndExpenseResponseInfo.builder()
            .expense(expense)
            .districtAverageIncome(districtAverageIncome)
            .build()));
    }
}

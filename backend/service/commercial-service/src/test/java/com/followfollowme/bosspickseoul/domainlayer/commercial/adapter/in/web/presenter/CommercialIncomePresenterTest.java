package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.presenter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.income.CommercialExpenseByCategoryInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.income.CommercialIncomeAndExpenseInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.CommercialIncomeSummaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.RegionalIncomeSummaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.policy.adapter.in.web.presenter.PolicyPresenter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class CommercialIncomePresenterTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final CommercialPresenter presenter = new CommercialPresenter(mock(PolicyPresenter.class));

    @Test
    @DisplayName("지출이 없는 분기는 빈 객체나 0 이 아니라 JSON null 로 내려간다")
    void incomeResponseKeepsMissingExpenseAsJsonNull() {
        JsonNode json = objectMapper.valueToTree(
            presenter.toCommercialIncomeResponse(CommercialIncomeAndExpenseInfo.builder().build()));

        assertThat(json.path("expenseByCategoryItem").isNull()).isTrue();
        // 원천 중단으로 사라진 소득 항목은 응답 계약에서 아예 빠진다.
        assertThat(json.has("averageIncomeItem")).isFalse();
    }

    @Test
    @DisplayName("지출이 있는 분기는 9개 항목을 그대로 내려보낸다")
    void incomeResponseCarriesExpenseWhenPresent() {
        JsonNode json = objectMapper.valueToTree(presenter.toCommercialIncomeResponse(
            CommercialIncomeAndExpenseInfo.builder()
                .expenseByCategoryInfo(CommercialExpenseByCategoryInfo.builder()
                    .groceryExpenseAmount(320_000)
                    .build())
                .build()));

        assertThat(json.path("expenseByCategoryItem").path("groceryExpenseAmount").asLong()).isEqualTo(320_000L);
    }

    @Test
    @DisplayName("지역 지출 요약은 행이 없는 단위만 null 로 비우고 나머지는 채운다")
    void incomeSummaryResponseKeepsMissingRegionAsJsonNull() {
        JsonNode json = objectMapper.valueToTree(presenter.toCommercialIncomeSummaryResponse(
            CommercialIncomeSummaryInfo.builder()
                .district(RegionalIncomeSummaryInfo.builder().code("11680").name("강남구").totalExpenseAmount(42L).build())
                .administration(null)
                .commercial(null)
                .build()));

        assertThat(json.path("district").path("totalExpenseAmount").asLong()).isEqualTo(42L);
        assertThat(json.path("administration").isNull()).isTrue();
        assertThat(json.path("commercial").isNull()).isTrue();
    }
}

package com.followfollowme.bosspickseoul.domainlayer.aireport.application.service.prompt;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialAnalysisWireMapper;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialExpenseByCategoryClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialIncomeAndExpenseClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialIncomeSummaryClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.RegionalIncomeSummaryClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.CommercialAiSourceData;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialIncomeAndExpenseQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialIncomeSummaryQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.RegionalIncomeSummaryQueryResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 지출이 wire DTO 에서 LLM 프롬프트 문자열까지 도달하는 사슬을, 값이 있을 때와 없을 때 양쪽으로 검사한다.
 *
 * <p><b>왜 필요한가.</b> 원천이 상권 단위 소득 제공을 중단하고 지출도 값을 주지 않는 분기가 생겼다(이슈 #413).
 * peer 가 지출 블록을 통째로 null 로 내려보내는데 프롬프트 조립이 그 null 을 0 으로 채우면
 * "지출 0원" 이 실측치처럼 LLM 근거로 들어가고, 역참조하면 리포트 생성이 통째로 NPE 로 죽는다.
 * 총 상주인구가 오래 0 으로 흘렀던 사고와 같은 모양이라 같은 방식으로 못 박는다.
 *
 * <p><b>덮지 못하는 구간.</b> QueryResult → {@link CommercialAiSourceData} 조립은 {@code AiReportProcessor} 안에 있고
 * 그 지점만 떼어 부르려면 Feign 포트 전부를 스텁해야 한다. 여기서는 그 대입과 같은 식을 테스트가 직접 한다.
 */
class CommercialExpensePromptChainTest {

    private final CommercialPromptFormatter formatter = new CommercialPromptFormatter();

    @Test
    @DisplayName("peer 가 지출을 주면 비중이 가장 큰 항목이 프롬프트에 찍힌다")
    void largestExpenseCategoryReachesPrompt() {
        CommercialIncomeAndExpenseClientResponse wire = new CommercialIncomeAndExpenseClientResponse(
            new CommercialExpenseByCategoryClientResponse(3201L, 3202L, 3203L, 3204L, 3205L, 3206L, 3207L, 3208L, 9999L)
        );

        CommercialIncomeAndExpenseQueryResult income = CommercialAnalysisWireMapper.toQueryResult(wire);
        CommercialAiSourceData sourceData = CommercialAiSourceData.builder()
            .largestExpenseCategory(largestExpenseCategory(income))
            .districtExpenseAmount(8101L)
            .administrationExpenseAmount(8102L)
            .commercialExpenseAmount(8103L)
            .build();

        String prompt = formatter.format(sourceData);

        assertThat(prompt).contains("[지출]");
        assertThat(prompt).contains("- 지출 비중이 가장 큰 항목: 유흥 (9,999)");
        assertThat(prompt).contains("- 자치구 총지출: 8,101");
        // 소득은 원천이 제공을 멈춰 섹션에서 걷어냈다.
        assertThat(prompt).doesNotContain("월 평균 소득");
    }

    @Test
    @DisplayName("peer 가 지출을 주지 않는 분기에는 0원 대신 결측 표기가 프롬프트에 들어간다")
    void missingExpenseIsMarkedNotAvailable() {
        CommercialIncomeAndExpenseQueryResult income =
            CommercialAnalysisWireMapper.toQueryResult(new CommercialIncomeAndExpenseClientResponse(null));

        CommercialAiSourceData sourceData = CommercialAiSourceData.builder()
            .largestExpenseCategory(largestExpenseCategory(income))
            .build();

        String prompt = formatter.format(sourceData);

        assertThat(prompt).contains("- 지출 비중이 가장 큰 항목: N/A");
        // "0" 을 실측치로 읽으면 LLM 이 "소비가 전혀 없는 상권" 이라는 잘못된 근거를 만든다.
        assertThat(prompt).doesNotContain("- 지출 비중이 가장 큰 항목: 식료품 (0)");
    }

    @Test
    @DisplayName("지출 요약의 지역 단위가 비어도 나머지 단위는 그대로 찍히고 빈 단위만 결측 표기가 된다")
    void partiallyMissingIncomeSummaryKeepsOtherRegions() {
        CommercialIncomeSummaryClientResponse wire = new CommercialIncomeSummaryClientResponse(
            new RegionalIncomeSummaryClientResponse("11140", "중구", 8101L), null, null
        );

        CommercialIncomeSummaryQueryResult summary = CommercialAnalysisWireMapper.toQueryResult(wire);
        CommercialAiSourceData sourceData = CommercialAiSourceData.builder()
            .largestExpenseCategory("N/A")
            .districtExpenseAmount(totalExpenseAmountOrNull(summary.district()))
            .administrationExpenseAmount(totalExpenseAmountOrNull(summary.administration()))
            .commercialExpenseAmount(totalExpenseAmountOrNull(summary.commercial()))
            .build();

        String prompt = formatter.format(sourceData);

        assertThat(prompt).contains("- 자치구 총지출: 8,101");
        assertThat(prompt).contains("- 행정동 총지출: N/A");
        assertThat(prompt).contains("- 상권 총지출: N/A");
    }

    /** {@code AiReportProcessor.formatLargestExpenseCategory} 와 같은 식이다. */
    private String largestExpenseCategory(CommercialIncomeAndExpenseQueryResult income) {
        if (income == null || income.expenseByCategory() == null) {
            return PromptFormatterSupport.NOT_AVAILABLE;
        }
        return PromptFormatterSupport.formatTopEntry(PromptFormatterSupport.orderedMap(
            "식료품", income.expenseByCategory().groceryExpenseAmount(),
            "의류", income.expenseByCategory().clothingExpenseAmount(),
            "의료", income.expenseByCategory().medicalExpenseAmount(),
            "생활용품", income.expenseByCategory().householdExpenseAmount(),
            "교통", income.expenseByCategory().transportationExpenseAmount(),
            "여가", income.expenseByCategory().leisureExpenseAmount(),
            "문화", income.expenseByCategory().cultureExpenseAmount(),
            "교육", income.expenseByCategory().educationExpenseAmount(),
            "유흥", income.expenseByCategory().entertainmentExpenseAmount()
        ));
    }

    /** {@code AiReportProcessor.totalExpenseAmountOrNull} 과 같은 식이다. */
    private Long totalExpenseAmountOrNull(RegionalIncomeSummaryQueryResult regional) {
        return regional == null ? null : regional.totalExpenseAmount();
    }
}

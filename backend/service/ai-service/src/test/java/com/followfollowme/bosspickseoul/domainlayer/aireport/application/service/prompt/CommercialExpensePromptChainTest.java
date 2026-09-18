package com.followfollowme.bosspickseoul.domainlayer.aireport.application.service.prompt;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialAnalysisWireMapper;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialExpenseCategoryClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialExpenseProvenanceClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialExpenseScopeClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialIncomeAndExpenseClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialIncomeSummaryClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.RegionalIncomeSummaryClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.CommercialAiExpenseCategory;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.CommercialAiExpenseProvenance;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.CommercialAiSourceData;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialExpenseCategoryQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialExpenseProvenanceQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialIncomeAndExpenseQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialIncomeSummaryQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.RegionalIncomeSummaryQueryResult;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 지출이 wire DTO 에서 LLM 프롬프트 문자열까지 도달하는 사슬을 해상도 사다리 세 갈래로 검사한다.
 *
 * <p><b>왜 필요한가.</b> 원천이 상권 단위 소득 제공을 중단하고 지출도 값을 주지 않는 분기가 생겼고(이슈 #413),
 * 이어서 상권 소비가 소속 행정동 값으로 <b>대체</b>되기 시작했다(이슈 #415). 금액만 프롬프트에 실으면 LLM 이
 * 행정동 추정치를 "이 상권의 소비" 로 단정한다. 반대로 peer 가 값을 주지 않을 때 0 으로 채우면
 * "소비가 전혀 없는 상권" 이라는 없는 근거가 생긴다. 총 상주인구가 오래 0 으로 흘렀던 사고와 같은 모양이라
 * 같은 방식으로 못 박는다.
 *
 * <p><b>항목 키를 고정하지 않는다.</b> 상권 네이티브는 9항목, 행정동 대체는 10항목(여가·문화 합산 + 기타·음식)이다.
 * 프롬프트는 배열을 순회해 peer 가 준 라벨을 그대로 적어야 하고, 이 테스트가 그 세 갈래를 모두 덮는다.
 *
 * <p><b>덮지 못하는 구간.</b> QueryResult → {@link CommercialAiSourceData} 조립은 {@code AiReportProcessor} 안에 있고
 * 그 지점만 떼어 부르려면 Feign 포트 전부를 스텁해야 한다. 여기서는 그 대입과 같은 식을 테스트가 직접 한다.
 */
class CommercialExpensePromptChainTest {

    private static final String PROXY_DISCLAIMER =
        "2024년 1분기부터 서울 열린데이터광장이 상권 단위 소비 제공을 중단해, 소속 행정동(청운효자동)의 추정 소비로 대체 표시합니다. "
            + "같은 행정동 안의 상권은 같은 값입니다.";

    private static final String DISCONTINUED_DISCLAIMER =
        "2024년 1분기부터 서울 열린데이터광장이 상권 단위 소비 제공을 중단했습니다. "
            + "이 분기는 대체할 행정동 소비도 없어 소비 지표를 제공하지 않습니다.";

    private final CommercialPromptFormatter formatter = new CommercialPromptFormatter();

    @Test
    @DisplayName("상권 네이티브 분기는 항목 9개와 상권 출처가 프롬프트에 찍히고 면책 줄은 생기지 않는다")
    void nativeCommercialExpenseReachesPromptWithoutDisclaimer() {
        CommercialIncomeAndExpenseClientResponse wire = new CommercialIncomeAndExpenseClientResponse(
            List.of(
                category("GROCERY", "식료품", 3201L),
                category("CLOTHING_FOOTWEAR", "의류·신발", 3202L),
                category("MEDICAL", "의료", 3203L),
                category("HOUSEHOLD", "생활용품", 3204L),
                category("TRANSPORTATION", "교통", 3205L),
                category("LEISURE", "여가", 3206L),
                category("CULTURE", "문화", 3207L),
                category("EDUCATION", "교육", 3208L),
                category("ENTERTAINMENT", "유흥", 9999L)
            ),
            35635L,
            new CommercialExpenseProvenanceClientResponse(
                new CommercialExpenseScopeClientResponse("COMMERCIAL", "상권", "상권 단위 원천에서 직접 집계한 값입니다."),
                "3110009", "명동역", "VwsmTrdhlNcmCnsmpQq", "서울시 상권분석서비스(소득소비-상권배후지)",
                "https://data.seoul.go.kr/dataList/OA-21278/S/1/datasetView.do", "20261", null
            )
        );

        String prompt = formatter.format(sourceData(CommercialAnalysisWireMapper.toQueryResult(wire), null));

        assertThat(prompt).contains("[지출]");
        assertThat(prompt).contains("- 소비 출처: 상권 (값을 가져온 영역: 명동역, 기준 분기: 20261, 원천: 서울시 상권분석서비스(소득소비-상권배후지))");
        assertThat(prompt).contains("- 총 지출: 35,635");
        assertThat(prompt).contains("- 항목별 지출: 식료품: 3,201, 의류·신발: 3,202, 의료: 3,203, 생활용품: 3,204, 교통: 3,205, "
            + "여가: 3,206, 문화: 3,207, 교육: 3,208, 유흥: 9,999");
        assertThat(prompt).contains("- 지출 비중이 가장 큰 항목: 유흥 (9,999)");
        // 네이티브는 대체가 아니다. 없는 경고를 실으면 LLM 이 실측치를 추정치처럼 깎아 말한다.
        assertThat(prompt).doesNotContain("- 유의:");
        // 소득은 원천이 제공을 멈춰 섹션에서 걷어냈다.
        assertThat(prompt).doesNotContain("월 평균 소득");
    }

    @Test
    @DisplayName("행정동 대체 분기는 항목 10개와 대체 사실·면책 문장이 프롬프트에 함께 실린다")
    void administrationProxyExpenseCarriesDisclaimerIntoPrompt() {
        CommercialIncomeAndExpenseClientResponse wire = new CommercialIncomeAndExpenseClientResponse(
            List.of(
                category("GROCERY", "식료품", 3301L),
                category("CLOTHING_FOOTWEAR", "의류·신발", 3302L),
                category("MEDICAL", "의료", 3303L),
                category("HOUSEHOLD", "생활용품", 3304L),
                category("TRANSPORTATION", "교통", 3305L),
                category("LEISURE_CULTURE", "여가·문화", 3306L),
                category("EDUCATION", "교육", 3307L),
                category("ENTERTAINMENT", "유흥", 3308L),
                category("OTHER", "기타", 3309L),
                category("DINING", "음식", 9999L)
            ),
            39744L,
            new CommercialExpenseProvenanceClientResponse(
                new CommercialExpenseScopeClientResponse(
                    "ADMINISTRATION_PROXY", "행정동 대체", "상권 단위 원천이 중단돼 소속 행정동 값으로 대체한 추정치입니다."
                ),
                "11110515", "청운효자동", "VwsmAdstrdNcmCnsmpW", "서울시 상권분석서비스(소득소비-행정동)",
                "https://data.seoul.go.kr/dataList/OA-22166/S/1/datasetView.do", "20261", PROXY_DISCLAIMER
            )
        );

        String prompt = formatter.format(sourceData(CommercialAnalysisWireMapper.toQueryResult(wire), null));

        assertThat(prompt).contains(
            "- 소비 출처: 행정동 대체 (값을 가져온 영역: 청운효자동, 기준 분기: 20261, 원천: 서울시 상권분석서비스(소득소비-행정동))");
        // 상권 스코프에 없던 기타·음식이 살아 있어야 한다. 키를 하드코딩하면 여기서 사라진다.
        assertThat(prompt).contains("여가·문화: 3,306").contains("기타: 3,309").contains("음식: 9,999");
        assertThat(prompt).doesNotContain("여가: 3,306");
        assertThat(prompt).contains("- 지출 비중이 가장 큰 항목: 음식 (9,999)");
        // 이 줄이 없으면 LLM 이 행정동 추정치를 이 상권의 실측으로 단정한다.
        assertThat(prompt).contains("- 유의: " + PROXY_DISCLAIMER);
    }

    @Test
    @DisplayName("소비를 제공하지 않는 분기에는 0원 대신 결측 표기가 들어가고 중단 사실이 함께 실린다")
    void unavailableExpenseIsMarkedNotAvailableWithReason() {
        CommercialIncomeAndExpenseClientResponse wire = new CommercialIncomeAndExpenseClientResponse(
            null, null,
            new CommercialExpenseProvenanceClientResponse(
                new CommercialExpenseScopeClientResponse("UNAVAILABLE", "제공 없음", "원천이 중단돼 이 분기에는 소비 지표를 제공하지 않습니다."),
                null, null, "VwsmTrdhlNcmCnsmpQq", "서울시 상권분석서비스(소득소비-상권배후지)",
                "https://data.seoul.go.kr/dataList/OA-21278/S/1/datasetView.do", null, DISCONTINUED_DISCLAIMER
            )
        );

        String prompt = formatter.format(sourceData(CommercialAnalysisWireMapper.toQueryResult(wire), null));

        assertThat(prompt).contains(
            "- 소비 출처: 제공 없음 (값을 가져온 영역: N/A, 기준 분기: N/A, 원천: 서울시 상권분석서비스(소득소비-상권배후지))");
        assertThat(prompt).contains("- 총 지출: N/A");
        assertThat(prompt).contains("- 항목별 지출: N/A");
        assertThat(prompt).contains("- 지출 비중이 가장 큰 항목: N/A");
        assertThat(prompt).contains("- 유의: " + DISCONTINUED_DISCLAIMER);
        // "0" 을 실측치로 읽으면 LLM 이 "소비가 전혀 없는 상권" 이라는 잘못된 근거를 만든다.
        assertThat(prompt).doesNotContain("- 총 지출: 0");
    }

    @Test
    @DisplayName("소득소비 응답 자체가 없으면 출처도 지어내지 않고 전부 결측 표기가 된다")
    void absentIncomeResponseKeepsEverythingNotAvailable() {
        // 어댑터가 peer 404 를 결측으로 흡수한 분기다. 이제 거의 타지 않지만 방어로 남아 있다. (이슈 #413)
        String prompt = formatter.format(sourceData(null, null));

        assertThat(prompt).contains("- 소비 출처: N/A");
        assertThat(prompt).contains("- 총 지출: N/A");
        assertThat(prompt).contains("- 지출 비중이 가장 큰 항목: N/A");
        assertThat(prompt).doesNotContain("- 유의:");
    }

    @Test
    @DisplayName("지출 요약의 지역 단위가 비어도 나머지 단위는 그대로 찍히고 빈 단위만 결측 표기가 된다")
    void partiallyMissingIncomeSummaryKeepsOtherRegions() {
        CommercialIncomeSummaryClientResponse wire = new CommercialIncomeSummaryClientResponse(
            new RegionalIncomeSummaryClientResponse("11140", "중구", 8101L), null, null, null
        );

        String prompt = formatter.format(sourceData(null, CommercialAnalysisWireMapper.toQueryResult(wire)));

        assertThat(prompt).contains("- 자치구 총지출: 8,101");
        assertThat(prompt).contains("- 행정동 총지출: N/A");
        assertThat(prompt).contains("- 상권 총지출: N/A");
        assertThat(prompt).contains("- 상권 총지출 출처: N/A");
    }

    @Test
    @DisplayName("요약의 상권 leg 가 대체값이면 지역 비교 섹션이 그 사실과 면책을 함께 싣는다")
    void proxiedCommercialSummaryLegCarriesProvenanceIntoPrompt() {
        CommercialIncomeSummaryClientResponse wire = new CommercialIncomeSummaryClientResponse(
            new RegionalIncomeSummaryClientResponse("11110", "종로구", 8101L),
            new RegionalIncomeSummaryClientResponse("11110515", "청운효자동", 8102L),
            new RegionalIncomeSummaryClientResponse("3110009", "경복궁역", 8102L),
            new CommercialExpenseProvenanceClientResponse(
                new CommercialExpenseScopeClientResponse(
                    "ADMINISTRATION_PROXY", "행정동 대체", "상권 단위 원천이 중단돼 소속 행정동 값으로 대체한 추정치입니다."
                ),
                "11110515", "청운효자동", "VwsmAdstrdNcmCnsmpW", "서울시 상권분석서비스(소득소비-행정동)",
                "https://data.seoul.go.kr/dataList/OA-22166/S/1/datasetView.do", "20261", PROXY_DISCLAIMER
            )
        );

        String prompt = formatter.format(sourceData(null, CommercialAnalysisWireMapper.toQueryResult(wire)));

        // 행정동과 상권 총지출이 같은 값인 이유가 프롬프트에 없으면 LLM 이 "상권이 행정동과 같은 수준" 이라고 읽는다.
        assertThat(prompt).contains("- 행정동 총지출: 8,102");
        assertThat(prompt).contains("- 상권 총지출: 8,102");
        assertThat(prompt).contains(
            "- 상권 총지출 출처: 행정동 대체 (값을 가져온 영역: 청운효자동, 기준 분기: 20261, 원천: 서울시 상권분석서비스(소득소비-행정동))");
        assertThat(prompt).contains("- 유의: " + PROXY_DISCLAIMER);
    }

    @Test
    @DisplayName("라벨이 같은 항목이 둘이어도 최댓값 후보에서 사라지지 않는다")
    void categoriesWithTheSameLabelAreNotCollapsed() {
        // 항목의 동일성은 key 다. 라벨을 Map 키로 삼으면 뒤의 항목이 앞의 것을 덮어써 최댓값이 조용히 바뀐다.
        CommercialIncomeAndExpenseClientResponse wire = new CommercialIncomeAndExpenseClientResponse(
            List.of(
                category("LEISURE", "여가·문화", 9_000L),
                category("CULTURE", "여가·문화", 10L)
            ),
            9_010L,
            new CommercialExpenseProvenanceClientResponse(
                new CommercialExpenseScopeClientResponse("COMMERCIAL", "상권", "상권 단위 원천에서 직접 집계한 값입니다."),
                "3110009", "명동역", "VwsmTrdhlNcmCnsmpQq", "서울시 상권분석서비스(소득소비-상권배후지)",
                "https://data.seoul.go.kr/dataList/OA-21278/S/1/datasetView.do", "20261", null
            )
        );

        String prompt = formatter.format(sourceData(CommercialAnalysisWireMapper.toQueryResult(wire), null));

        assertThat(prompt).contains("- 지출 비중이 가장 큰 항목: 여가·문화 (9,000)");
    }

    @Test
    @DisplayName("같은 면책 문장이 [지출] 과 [지역 비교] 에 두 번 실리지 않는다")
    void theSameDisclaimerIsNotRepeatedAcrossSections() {
        // 반복된 경고는 LLM 이 리포트 본문에도 두 번 옮겨 적게 만든다. 20261 은 상권 1,650곳이 전부 이 경로다.
        CommercialIncomeAndExpenseClientResponse income = new CommercialIncomeAndExpenseClientResponse(
            null, null, unavailableProvenance()
        );
        CommercialIncomeSummaryClientResponse summary = new CommercialIncomeSummaryClientResponse(
            new RegionalIncomeSummaryClientResponse("11110", "종로구", 8101L),
            new RegionalIncomeSummaryClientResponse("11110515", "청운효자동", 8102L),
            null,
            unavailableProvenance()
        );

        String prompt = formatter.format(sourceData(
            CommercialAnalysisWireMapper.toQueryResult(income), CommercialAnalysisWireMapper.toQueryResult(summary)));

        assertThat(prompt).contains("- 유의: " + DISCONTINUED_DISCLAIMER);
        assertThat(countOccurrences(prompt, DISCONTINUED_DISCLAIMER)).isEqualTo(1);
    }

    private static CommercialExpenseProvenanceClientResponse unavailableProvenance() {
        return new CommercialExpenseProvenanceClientResponse(
            new CommercialExpenseScopeClientResponse("UNAVAILABLE", "제공 없음", "원천이 중단돼 이 분기에는 소비 지표를 제공하지 않습니다."),
            null, null, "VwsmTrdhlNcmCnsmpQq", "서울시 상권분석서비스(소득소비-상권배후지)",
            "https://data.seoul.go.kr/dataList/OA-21278/S/1/datasetView.do", null, DISCONTINUED_DISCLAIMER
        );
    }

    private static int countOccurrences(String text, String token) {
        int count = 0;
        int index = text.indexOf(token);
        while (index >= 0) {
            count++;
            index = text.indexOf(token, index + token.length());
        }
        return count;
    }

    private CommercialExpenseCategoryClientResponse category(String key, String label, long amount) {
        return new CommercialExpenseCategoryClientResponse(key, label, amount);
    }

    /** {@code AiReportProcessor.buildCommercialSourceData} 의 지출 관련 대입과 같은 식이다. */
    private CommercialAiSourceData sourceData(
        CommercialIncomeAndExpenseQueryResult income, CommercialIncomeSummaryQueryResult summary
    ) {
        return CommercialAiSourceData.builder()
            .largestExpenseCategory(largestExpenseCategory(income))
            .expenseCategories(expenseCategories(income))
            .totalExpenseAmount(income == null ? null : income.totalExpenseAmount())
            .expenseProvenance(expenseProvenance(income == null ? null : income.provenance()))
            .districtExpenseAmount(totalExpenseAmountOrNull(summary == null ? null : summary.district()))
            .administrationExpenseAmount(totalExpenseAmountOrNull(summary == null ? null : summary.administration()))
            .commercialExpenseAmount(totalExpenseAmountOrNull(summary == null ? null : summary.commercial()))
            .commercialExpenseProvenance(expenseProvenance(summary == null ? null : summary.commercialProvenance()))
            .build();
    }

    /** {@code AiReportProcessor.formatLargestExpenseCategory} 가 부르는 바로 그 코드다. 식을 베껴 쓰지 않는다. */
    private String largestExpenseCategory(CommercialIncomeAndExpenseQueryResult income) {
        return PromptFormatterSupport.formatTopExpenseCategory(income == null ? null : income.expenseCategories());
    }

    /** {@code AiReportProcessor.toExpenseCategories} 와 같은 식이다. */
    private List<CommercialAiExpenseCategory> expenseCategories(CommercialIncomeAndExpenseQueryResult income) {
        List<CommercialExpenseCategoryQueryResult> categories = income == null ? null : income.expenseCategories();
        if (categories == null) {
            return null;
        }
        return categories.stream()
            .map(category -> new CommercialAiExpenseCategory(category.label(), category.amount()))
            .toList();
    }

    /** {@code AiReportProcessor.toExpenseProvenance} 와 같은 식이다. */
    private CommercialAiExpenseProvenance expenseProvenance(CommercialExpenseProvenanceQueryResult provenance) {
        if (provenance == null) {
            return null;
        }
        return new CommercialAiExpenseProvenance(
            provenance.scope() == null ? null : provenance.scope().name(),
            provenance.scopeName(),
            provenance.effectivePeriodCode(),
            provenance.sourceLabel(),
            provenance.disclaimer()
        );
    }

    /** {@code AiReportProcessor.totalExpenseAmountOrNull} 과 같은 식이다. */
    private Long totalExpenseAmountOrNull(RegionalIncomeSummaryQueryResult regional) {
        return regional == null ? null : regional.totalExpenseAmount();
    }
}

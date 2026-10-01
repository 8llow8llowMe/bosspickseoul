package com.followfollowme.bosspickseoul.domainlayer.aireport.application.service.prompt;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialAnalysisWireMapper;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialDistrictAverageIncomeClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialIncomeAndExpenseClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialIncomeProvenanceClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialIncomeScopeClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.CommercialAiExpenseProvenance;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.CommercialAiIncomeProvenance;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.CommercialAiSourceData;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialDistrictAverageIncomeQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialIncomeAndExpenseQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialIncomeProvenanceQueryResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 자치구 평균 소득(대체)이 wire DTO 에서 LLM 프롬프트 문자열까지 도달하는 사슬을 검사한다.
 *
 * <p><b>왜 필요한가.</b> 상권 단위 소득 원천이 끊겨(이슈 #413) 소속 자치구의 국민연금 지역가입자 신고 평균소득월액을
 * 참고값으로 싣는다(이슈 #415). 이 값은 상권이나 주민 전체의 소득이 아니고 같은 자치구 안의 상권은 모두 같은 값이다.
 * 금액만 실으면 LLM 이 "이 상권의 소득은 ~" 으로 단정한다. 반대로 값이 없을 때 0 으로 채우면 "소득이 0원인 상권" 이라는
 * 없는 근거가 생긴다. 소비 출처와 같은 방식으로 못 박는다.
 *
 * <p><b>세 갈래.</b> 자치구 대체(값 있음) / 제공 없음(값 없음 + 사유) / 이 필드를 모르는 이전 commercial-service 응답.
 * 마지막은 이 서비스가 먼저 배포된 구간에 실제로 타는 경로다.
 *
 * <p><b>덮지 못하는 구간.</b> QueryResult → {@link CommercialAiSourceData} 조립은 {@code AiReportProcessor} 안에 있고
 * 그 지점만 떼어 부르려면 Feign 포트 전부를 스텁해야 한다. 여기서는 그 대입과 같은 식을 테스트가 직접 한다.
 */
class CommercialDistrictIncomePromptChainTest {

    private static final String SOURCE_ID = "data.go.kr:3046077";

    private static final String SOURCE_LABEL = "국민연금공단 자격 시군구 신고 평균소득월액";

    private static final String SOURCE_URL = "https://www.data.go.kr/data/3046077/fileData.do";

    private static final String PROXY_DISCLAIMER =
        "국민연금 지역가입자(사업장 가입자가 아닌 18~60세 국내 거주자)가 신고한 기준소득월액의 종로구 평균입니다(기준일 2024-12-31). "
            + "이 상권이나 주민 전체의 소득이 아니며, 같은 자치구 안의 상권은 모두 같은 값입니다.";

    private static final String UNAVAILABLE_DISCLAIMER = "이 분기에 쓸 수 있는 자치구 평균 소득 자료가 없어 소득 지표를 제공하지 않습니다.";

    private static final String EXPENSE_DISCONTINUED_DISCLAIMER =
        "2024년 1분기부터 서울 열린데이터광장이 상권 단위 소비 제공을 중단했습니다. "
            + "이 분기는 대체할 행정동 소비도 없어 소비 지표를 제공하지 않습니다.";

    private final CommercialPromptFormatter formatter = new CommercialPromptFormatter();

    @Test
    @DisplayName("자치구 대체 소득은 금액·값을 가져온 자치구·기준일·원천이 한 줄에, 면책 문장이 「유의」 줄에 실린다")
    void districtProxyIncomeReachesPromptWithSourceAndDisclaimer() {
        CommercialDistrictAverageIncomeClientResponse districtAverageIncome = new CommercialDistrictAverageIncomeClientResponse(
            1_555_244L,
            new CommercialIncomeProvenanceClientResponse(
                new CommercialIncomeScopeClientResponse(
                    "DISTRICT_PROXY", "자치구 대체", "상권 단위 소득 원천이 없어 소속 자치구의 국민연금 지역가입자 신고 평균소득월액으로 대체한 참고값입니다."
                ),
                "11110", "종로구", SOURCE_ID, SOURCE_LABEL, SOURCE_URL, "2024-12-31", PROXY_DISCLAIMER
            )
        );

        String prompt = formatter.format(sourceData(CommercialAnalysisWireMapper.toQueryResult(incomeWire(districtAverageIncome))));

        // 줄 이름의 「(대체)」와 값을 가져온 자치구가 빠지면 LLM 이 자치구 평균을 이 상권의 소득으로 단정한다.
        assertThat(prompt).contains("""
            [소득]
            - 자치구 평균 소득(대체): 1,555,244원/월 (값을 가져온 영역: 종로구, 기준일: 2024-12-31, 원천: 국민연금공단 자격 시군구 신고 평균소득월액)
            - 유의: %s
            """.formatted(PROXY_DISCLAIMER));
        assertThat(prompt.indexOf("[지출]")).isLessThan(prompt.indexOf("[소득]"));
        assertThat(prompt.indexOf("[소득]")).isLessThan(prompt.indexOf("[점포 분석]"));
    }

    @Test
    @DisplayName("자치구 평균 소득 자료가 없으면 0원 대신 결측 표기가 들어가고 사유가 「유의」 줄에 실린다")
    void unavailableIncomeIsMarkedNotAvailableWithReason() {
        CommercialDistrictAverageIncomeClientResponse districtAverageIncome = new CommercialDistrictAverageIncomeClientResponse(
            null,
            new CommercialIncomeProvenanceClientResponse(
                new CommercialIncomeScopeClientResponse("UNAVAILABLE", "제공 없음", UNAVAILABLE_DISCLAIMER),
                null, null, SOURCE_ID, SOURCE_LABEL, SOURCE_URL, null, UNAVAILABLE_DISCLAIMER
            )
        );

        String prompt = formatter.format(sourceData(CommercialAnalysisWireMapper.toQueryResult(incomeWire(districtAverageIncome))));

        assertThat(prompt).contains("""
            [소득]
            - 자치구 평균 소득(대체): N/A
            - 유의: %s
            """.formatted(UNAVAILABLE_DISCLAIMER));
        // 값이 없는데 「값을 가져온 영역」을 적으면 LLM 이 그 영역에 값이 있다고 읽는다.
        assertThat(prompt).doesNotContain("원/월");
        assertThat(prompt).doesNotContain("- 자치구 평균 소득(대체): 0");
    }

    @Test
    @DisplayName("자치구 평균 소득을 모르는 이전 응답이면 결측 표기만 남고 지어낸 출처·면책은 없다")
    void legacyResponseWithoutDistrictIncomeIsMarkedNotAvailable() {
        // 이 서비스가 commercial-service 보다 먼저 배포된 구간이다. 응답에 districtAverageIncome 키 자체가 없다.
        String prompt = formatter.format(sourceData(CommercialAnalysisWireMapper.toQueryResult(incomeWire(null))));

        assertThat(prompt).contains("[소득]\n- 자치구 평균 소득(대체): N/A\n");
        assertThat(prompt).doesNotContain("- 유의:");
        assertThat(prompt).doesNotContain("- 자치구 평균 소득(대체): 0");
    }

    @Test
    @DisplayName("소득소비 응답 자체가 없어도 소득은 결측 표기가 된다")
    void absentIncomeResponseKeepsDistrictIncomeNotAvailable() {
        // 어댑터가 peer 404 를 결측으로 흡수한 분기다. (이슈 #413)
        String prompt = formatter.format(sourceData(null));

        assertThat(prompt).contains("[소득]\n- 자치구 평균 소득(대체): N/A\n");
        assertThat(prompt).doesNotContain("- 유의:");
    }

    @Test
    @DisplayName("소득 면책은 소비 면책과 따로 한 번씩 실리고, 소비 면책의 섹션 간 중복 제거는 그대로다")
    void incomeDisclaimerDoesNotDisturbExpenseDisclaimerDedup() {
        // 20261 처럼 소비는 대체할 행정동 값도 없어 중단, 소득은 자치구 대체(기준일 2024-12-31)인 경우다. 소비 면책은
        // [지출] 과 [지역 비교] 가 같은 문장이라 한 번만, 소득 면책은 다른 문장이라 따로 한 번 실려야 한다.
        CommercialAiExpenseProvenance expenseProvenance = new CommercialAiExpenseProvenance(
            "제공 없음", null, null, "서울시 상권분석서비스(소득소비-상권배후지)", EXPENSE_DISCONTINUED_DISCLAIMER
        );
        CommercialDistrictAverageIncomeClientResponse districtAverageIncome = new CommercialDistrictAverageIncomeClientResponse(
            1_555_244L,
            new CommercialIncomeProvenanceClientResponse(
                new CommercialIncomeScopeClientResponse("DISTRICT_PROXY", "자치구 대체", "소속 자치구 값으로 대체한 참고값입니다."),
                "11110", "종로구", SOURCE_ID, SOURCE_LABEL, SOURCE_URL, "2024-12-31", PROXY_DISCLAIMER
            )
        );

        String prompt = formatter.format(
            sourceData(CommercialAnalysisWireMapper.toQueryResult(incomeWire(districtAverageIncome)), expenseProvenance)
        );

        assertThat(countOccurrences(prompt, EXPENSE_DISCONTINUED_DISCLAIMER)).isEqualTo(1);
        assertThat(countOccurrences(prompt, PROXY_DISCLAIMER)).isEqualTo(1);
        assertThat(countOccurrences(prompt, "- 유의: ")).isEqualTo(2);
    }

    private static CommercialIncomeAndExpenseClientResponse incomeWire(CommercialDistrictAverageIncomeClientResponse districtAverageIncome) {
        return new CommercialIncomeAndExpenseClientResponse(null, null, null, districtAverageIncome);
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

    private CommercialAiSourceData sourceData(CommercialIncomeAndExpenseQueryResult income) {
        return sourceData(income, null);
    }

    /** {@code AiReportProcessor.buildCommercialSourceData} 의 소득 관련 대입과 같은 식이다. 소비 출처는 모델로 바로 넣는다. */
    private CommercialAiSourceData sourceData(CommercialIncomeAndExpenseQueryResult income, CommercialAiExpenseProvenance expenseProvenance) {
        CommercialDistrictAverageIncomeQueryResult districtAverageIncome = income == null ? null : income.districtAverageIncome();
        return CommercialAiSourceData.builder()
            .expenseProvenance(expenseProvenance)
            .commercialExpenseProvenance(expenseProvenance)
            .districtAverageIncomeAmount(districtAverageIncome == null ? null : districtAverageIncome.amount())
            .districtAverageIncomeProvenance(incomeProvenance(districtAverageIncome == null ? null : districtAverageIncome.provenance()))
            .build();
    }

    /** {@code AiReportProcessor.toIncomeProvenance} 와 같은 식이다. */
    private CommercialAiIncomeProvenance incomeProvenance(CommercialIncomeProvenanceQueryResult provenance) {
        if (provenance == null) {
            return null;
        }
        return new CommercialAiIncomeProvenance(
            provenance.scopeName(),
            provenance.referenceDate(),
            provenance.sourceLabel(),
            provenance.disclaimer()
        );
    }
}

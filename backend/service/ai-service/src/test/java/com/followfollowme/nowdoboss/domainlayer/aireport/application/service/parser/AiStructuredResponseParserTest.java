package com.followfollowme.nowdoboss.domainlayer.aireport.application.service.parser;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class AiStructuredResponseParserTest {

    private AiStructuredResponseParser parser;

    @BeforeEach
    void setUp() {
        parser = new AiStructuredResponseParser(new ObjectMapper());
    }

    @Test
    void parseCommercialReport_whenNarrativeFieldsAreKorean_thenSucceeds() {
        String content = """
            {
              "summary": "유동인구와 매출 흐름이 안정적인 상권입니다.",
              "strengths": ["점심 수요가 꾸준합니다."],
              "risks": ["야간 수요는 제한적입니다."],
              "recommendedBusinessCategories": ["한식", "카페"],
              "recommendedCustomerSegments": ["직장인", "20대"],
              "recommendedOperatingHours": ["11-14", "17-21"],
              "avoidOperatingHours": ["00-06"],
              "targetAgeGroups": ["20대", "30대"],
              "targetGenders": ["남성", "여성"],
              "operationTips": ["점심 메뉴 회전율을 높이세요."],
              "businessInsight": "직장인 점심 수요를 중심으로 운영 효율을 높이기 좋습니다."
            }
            """;

        assertThatCode(() -> parser.parseCommercialReport(content)).doesNotThrowAnyException();
    }

    @Test
    void parseCommercialReport_whenNarrativeFieldsAreEnglish_thenFails() {
        String content = """
            {
              "summary": "Stable market with decent foot traffic.",
              "strengths": ["Lunch demand is consistent."],
              "risks": ["Night demand is limited."],
              "recommendedBusinessCategories": ["Korean food", "Cafe"],
              "recommendedCustomerSegments": ["Office workers", "20s"],
              "recommendedOperatingHours": ["11-14", "17-21"],
              "avoidOperatingHours": ["00-06"],
              "targetAgeGroups": ["20s", "30s"],
              "targetGenders": ["Male", "Female"],
              "operationTips": ["Improve lunch turnover."],
              "businessInsight": "This area fits efficient lunch-focused operations."
            }
            """;

        assertThatThrownBy(() -> parser.parseCommercialReport(content))
            .isInstanceOf(AiReportException.class);
    }

    @Test
    void parseDistrictReport_whenNarrativeFieldsAreEnglish_thenFails() {
        String content = """
            {
              "summary": "Sales are recovering.",
              "marketStatus": "Growth market",
              "recommendedBusinessCategories": ["Cafe"],
              "cautionBusinessCategories": ["Bar"],
              "businessInsight": "This district suits daytime demand."
            }
            """;

        assertThatThrownBy(() -> parser.parseDistrictReport(content))
            .isInstanceOf(AiReportException.class);
    }

    @Test
    void parseCommercialComparisonReport_whenNarrativeFieldsAreKorean_thenSucceeds() {
        String content = """
            {
              "summary": "좌측 상권이 현재 업종 기준으로 더 안정적인 선택지입니다.",
              "recommendedSide": "LEFT",
              "recommendedReasons": ["매출 규모가 더 큽니다.", "거주 수요가 더 안정적입니다."],
              "riskComparison": "두 상권 모두 경쟁 강도는 함께 확인하는 것이 좋습니다.",
              "timeSlotInsight": "좌측 상권은 점심, 우측 상권은 저녁 시간대가 강합니다.",
              "customerSegmentInsight": "좌측은 30대, 우측은 20대 비중이 상대적으로 높습니다.",
              "operationStrategy": ["좌측 상권을 우선 후보로 검토하세요.", "점심 수요 대응 전략을 준비하세요."],
              "businessInsight": "좌측 상권이 초기 진입 전략 측면에서 더 유리해 보입니다."
            }
            """;

        assertThatCode(() -> parser.parseCommercialComparisonReport(content)).doesNotThrowAnyException();
    }

    @Test
    void parseCommercialComparisonReport_whenNarrativeFieldsAreEnglish_thenFails() {
        String content = """
            {
              "summary": "Left side is a better option.",
              "recommendedSide": "LEFT",
              "recommendedReasons": ["Higher sales", "Stable demand"],
              "riskComparison": "Competition should be checked.",
              "timeSlotInsight": "Lunch is stronger on the left.",
              "customerSegmentInsight": "People in their 30s are dominant.",
              "operationStrategy": ["Choose the left area first."],
              "businessInsight": "The left side looks better for entry."
            }
            """;

        assertThatThrownBy(() -> parser.parseCommercialComparisonReport(content))
            .isInstanceOf(AiReportException.class);
    }
}

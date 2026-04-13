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
}

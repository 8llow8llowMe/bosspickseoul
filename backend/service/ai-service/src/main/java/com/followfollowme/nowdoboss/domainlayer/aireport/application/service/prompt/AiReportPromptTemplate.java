package com.followfollowme.nowdoboss.domainlayer.aireport.application.service.prompt;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.CommercialAiSourceData;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.DistrictAiSourceData;

public final class AiReportPromptTemplate {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private AiReportPromptTemplate() {
    }

    public static String buildCommercialPrompt(CommercialAiSourceData sourceData) {
        return """
            당신은 서울시 상권 분석 서비스의 AI 리포트 도우미입니다.
            반드시 제공된 데이터만 사용해 상권 분석 요약을 작성하세요.
            창업 성공, 투자 수익, 매출 보장을 단정적으로 표현하면 안 됩니다.
            모든 문장은 제공된 상권 데이터 기준으로만 해석해야 합니다.
            응답은 지정된 JSON 스키마만 따라야 하며, JSON 외 텍스트를 추가하면 안 됩니다.

            [대상]
            - 상권 코드: %s
            - 서비스 코드: %s
            - 기준 분기: %s

            [상권 소속 지역 메타]
            %s

            [유동인구]
            %s

            [매출]
            %s

            [집객시설]
            %s

            [상주인구]
            %s

            [소득/지출]
            %s

            [점포 분석]
            %s

            [자치구/행정동/상권 매출 요약]
            %s

            [자치구/행정동/상권 소득/지출 요약]
            %s
            """.formatted(
            sourceData.commercialCode(),
            sourceData.serviceCode(),
            sourceData.periodCode(),
            stringify(sourceData.administrationInfo()),
            stringify(sourceData.footTraffic()),
            stringify(sourceData.sales()),
            stringify(sourceData.facility()),
            stringify(sourceData.population()),
            stringify(sourceData.income()),
            stringify(sourceData.store()),
            stringify(sourceData.salesSummary()),
            stringify(sourceData.incomeSummary())
        );
    }

    public static String buildDistrictPrompt(DistrictAiSourceData sourceData) {
        return """
            당신은 서울시 자치구 상권 분석 서비스의 AI 리포트 도우미입니다.
            반드시 제공된 데이터만 사용해 자치구 단위 시장 상황을 요약하세요.
            창업 성공, 투자 수익, 매출 보장을 단정적으로 표현하면 안 됩니다.
            모든 문장은 제공된 자치구 데이터 기준으로만 해석해야 합니다.
            응답은 지정된 JSON 스키마만 따라야 하며, JSON 외 텍스트를 추가하면 안 됩니다.

            [대상]
            - 자치구 코드: %s
            - 기준 분기: %s

            [자치구 분석 데이터]
            %s
            """.formatted(sourceData.districtCode(), sourceData.periodCode(), stringify(sourceData.districtDetail()));
    }

    private static String stringify(Object value) {
        try {
            return value == null ? "{}" : OBJECT_MAPPER.writerWithDefaultPrettyPrinter().writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            return String.valueOf(value);
        }
    }
}

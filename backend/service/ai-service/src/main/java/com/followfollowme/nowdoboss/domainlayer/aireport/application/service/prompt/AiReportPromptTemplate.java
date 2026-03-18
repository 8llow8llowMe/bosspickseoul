package com.followfollowme.nowdoboss.domainlayer.aireport.application.service.prompt;

import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.CommercialAiSourceData;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.DistrictAiSourceData;

public final class AiReportPromptTemplate {

    private AiReportPromptTemplate() {
    }

    public static String buildCommercialPrompt(CommercialAiSourceData sourceData) {
        return """
            당신은 서울시 상권 분석 서비스의 AI 리포트 생성기입니다.
            반드시 제공된 데이터만 근거로 판단하고, 과장되거나 단정적인 창업 성공 표현을 사용하지 마세요.
            투자 수익 보장 표현, 근거 없는 외부 정보, 확인되지 않은 트렌드 추정은 금지합니다.
            결과는 JSON 스키마에 맞는 값만 작성하세요.

            [대상]
            - 상권 코드: %s
            - 서비스 코드: %s
            - 기준 분기: %s

            [행정동/자치구 메타]
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

            [자치구/행정동/상권 지출 요약]
            %s

            모든 문장은 "제공된 상권 데이터 기준"으로 해석해야 합니다.
            """.formatted(
            sourceData.commercialCode(),
            sourceData.serviceCode(),
            sourceData.periodCode(),
            sourceData.administrationInfo().toPrettyString(),
            sourceData.footTraffic().toPrettyString(),
            sourceData.sales().toPrettyString(),
            sourceData.facility().toPrettyString(),
            sourceData.population().toPrettyString(),
            sourceData.income().toPrettyString(),
            sourceData.store().toPrettyString(),
            sourceData.salesSummary().toPrettyString(),
            sourceData.incomeSummary().toPrettyString()
        );
    }

    public static String buildDistrictPrompt(DistrictAiSourceData sourceData) {
        return """
            당신은 서울시 상권 분석 서비스의 AI 리포트 생성기입니다.
            반드시 제공된 데이터만 근거로 판단하고, 과장되거나 단정적인 창업 성공 표현을 사용하지 마세요.
            투자 수익 보장 표현, 근거 없는 외부 정보, 확인되지 않은 트렌드 추정은 금지합니다.
            결과는 JSON 스키마에 맞는 값만 작성하세요.

            [대상]
            - 자치구 코드: %s
            - 기준 분기: %s

            [자치구 상세 분석 데이터]
            %s

            모든 문장은 "제공된 상권 데이터 기준"으로 해석해야 합니다.
            """.formatted(
            sourceData.districtCode(),
            sourceData.periodCode(),
            sourceData.districtDetail().toPrettyString()
        );
    }
}

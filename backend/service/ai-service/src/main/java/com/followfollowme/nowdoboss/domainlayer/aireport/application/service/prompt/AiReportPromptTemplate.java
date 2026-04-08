package com.followfollowme.nowdoboss.domainlayer.aireport.application.service.prompt;

import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.AdministrationAiSourceData;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.CommercialAiSourceData;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.DistrictAiSourceData;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AiReportPromptTemplate {

    private final CommercialPromptFormatter commercialPromptFormatter;
    private final DistrictPromptFormatter districtPromptFormatter;
    private final AdministrationPromptFormatter administrationPromptFormatter;

    public String buildCommercialPrompt(CommercialAiSourceData sourceData) {
        return """
            당신은 서울시 상권 분석 서비스의 AI 리포트 도우미입니다.
            제공된 데이터만 사용해서 상권을 해석하고, 근거 없는 추정은 하지 마세요.
            창업 성공, 투자 수익, 매출 보장처럼 단정적인 표현은 금지합니다.
            응답은 반드시 지정된 JSON 스키마만 따르고, JSON 외의 설명 문장은 추가하지 마세요.

            [대상]
            - 상권 코드: %s
            - 서비스 코드: %s
            - 기준 분기: %s

            [분석 입력 데이터]
            %s
            """.formatted(
            sourceData.commercialCode(),
            sourceData.serviceCode(),
            sourceData.periodCode(),
            commercialPromptFormatter.format(sourceData)
        );
    }

    public String buildDistrictPrompt(DistrictAiSourceData sourceData) {
        return """
            당신은 서울시 자치구 상권 분석 서비스의 AI 리포트 도우미입니다.
            제공된 데이터만 사용해서 자치구 상권을 해석하고, 근거 없는 추정은 하지 마세요.
            창업 성공, 투자 수익, 매출 보장처럼 단정적인 표현은 금지합니다.
            응답은 반드시 지정된 JSON 스키마만 따르고, JSON 외의 설명 문장은 추가하지 마세요.

            [대상]
            - 자치구 코드: %s
            - 기준 분기: %s

            [분석 입력 데이터]
            %s
            """.formatted(sourceData.districtCode(), sourceData.periodCode(), districtPromptFormatter.format(sourceData));
    }

    public String buildAdministrationPrompt(AdministrationAiSourceData sourceData) {
        return """
            당신은 서울시 행정동 상권 분석 서비스의 AI 리포트 도우미입니다.
            제공된 데이터만 사용해서 행정동 상권을 해석하고, 근거 없는 추정은 하지 마세요.
            창업 성공, 투자 수익, 매출 보장처럼 단정적인 표현은 금지합니다.
            응답은 반드시 지정된 JSON 스키마만 따르고, JSON 외의 설명 문장은 추가하지 마세요.

            [대상]
            - 행정동 코드: %s
            - 기준 분기: %s

            [분석 입력 데이터]
            %s
            """.formatted(sourceData.administrationCode(), sourceData.periodCode(), administrationPromptFormatter.format(sourceData));
    }
}

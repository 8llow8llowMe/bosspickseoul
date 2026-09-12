package com.followfollowme.bosspickseoul.domainlayer.aireport.application.service.prompt;

import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.AdministrationAiSourceData;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.CommercialAiSourceData;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.CommercialComparisonAiSourceData;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.DistrictAiSourceData;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AiReportPromptTemplate {

    // 지시문 정본은 AiReportPromptRules 한 곳이다. provider 별 어댑터도 같은 상수를 system 메시지로 쓴다.
    private static final String COMMON_RULES = AiReportPromptRules.COMMON_RULES;

    private final CommercialPromptFormatter commercialPromptFormatter;
    private final CommercialComparisonPromptFormatter commercialComparisonPromptFormatter;
    private final DistrictPromptFormatter districtPromptFormatter;
    private final AdministrationPromptFormatter administrationPromptFormatter;

    public String buildCommercialPrompt(CommercialAiSourceData sourceData) {
        return """
            %s

            [대상]
            - 상권명: %s (상권 코드 %s)
            - 위치: %s %s
            - 업종 코드: %s
            - 기준 분기: %s

            [응답 언어 규칙]
            - 모든 문자열 필드는 자연스러운 한국어로 작성하세요.
            - `recommendedBusinessCategories`는 한국어 업종군 이름으로 작성하세요.
            - `avoidOperatingHours`, `recommendedOperatingHours`는 제공된 시간대 코드 그대로 사용해도 됩니다.
            - `targetAgeGroups`, `targetGenders`는 제공된 축 이름을 유지하되 설명 문장은 한국어로 작성하세요.

            [필수 JSON 필드]
            - summary: string
            - strengths: string[]
            - risks: string[]
            - recommendedBusinessCategories: string[]
            - recommendedCustomerSegments: string[]
            - recommendedOperatingHours: string[]
            - avoidOperatingHours: string[]
            - targetAgeGroups: string[]
            - targetGenders: string[]
            - operationTips: string[]
            - businessInsight: string

            [입력 데이터]
            %s
            """.formatted(
            COMMON_RULES,
            sourceData.commercialName(),
            sourceData.commercialCode(),
            sourceData.districtName(),
            sourceData.administrationName(),
            sourceData.serviceCode(),
            sourceData.periodCode(),
            commercialPromptFormatter.format(sourceData)
        );
    }

    public String buildCommercialComparisonPrompt(CommercialComparisonAiSourceData sourceData) {
        return """
            %s

            [대상]
            - 좌측 상권: %s (%s %s, 상권 코드 %s)
            - 우측 상권: %s (%s %s, 상권 코드 %s)
            - 업종 코드: %s
            - 기준 분기: %s

            [응답 언어 규칙]
            - 모든 서술형 문장과 문자열은 자연스러운 한국어로 작성하세요
            - `recommendedSide`는 반드시 `LEFT`, `RIGHT`, `BALANCED` 중 하나로 작성하세요
            - `recommendedReasons`, `operationStrategy`는 비어 있지 않은 문자열 배열로 작성하세요

            [필수 JSON 필드]
            - summary: string
            - recommendedSide: string
            - recommendedReasons: string[]
            - riskComparison: string
            - timeSlotInsight: string
            - customerSegmentInsight: string
            - operationStrategy: string[]
            - businessInsight: string

            [입력 데이터]
            %s
            """.formatted(
            COMMON_RULES,
            sourceData.leftCommercialName(),
            sourceData.leftDistrictName(),
            sourceData.leftAdministrationName(),
            sourceData.leftCommercialCode(),
            sourceData.rightCommercialName(),
            sourceData.rightDistrictName(),
            sourceData.rightAdministrationName(),
            sourceData.rightCommercialCode(),
            sourceData.serviceCode(),
            sourceData.periodCode(),
            commercialComparisonPromptFormatter.format(sourceData)
        );
    }

    public String buildDistrictPrompt(DistrictAiSourceData sourceData) {
        return """
            %s

            [대상]
            - 자치구: %s (자치구 코드 %s)
            - 기준 분기: %s

            [응답 언어 규칙]
            - 모든 문자열 필드는 한국어로 작성하세요.
            - `recommendedBusinessCategories`, `cautionBusinessCategories`는 한국어 업종명으로 작성하세요.

            [필수 JSON 필드]
            - summary: string
            - marketStatus: string
            - recommendedBusinessCategories: string[]
            - cautionBusinessCategories: string[]
            - businessInsight: string

            위 필드명을 그대로 사용한 평평한 JSON 객체 하나만 반환하세요. 다른 키를 만들지 마세요.

            [입력 데이터]
            %s
            """.formatted(
            COMMON_RULES,
            sourceData.districtName(),
            sourceData.districtCode(),
            sourceData.periodCode(),
            districtPromptFormatter.format(sourceData)
        );
    }

    public String buildAdministrationPrompt(AdministrationAiSourceData sourceData) {
        return """
            %s

            [대상]
            - 행정동: %s %s (행정동 코드 %s)
            - 기준 분기: %s

            [응답 언어 규칙]
            - 모든 문자열 필드는 한국어로 작성하세요.
            - `recommendedBusinessCategories`, `cautionBusinessCategories`는 한국어 업종명으로 작성하세요.

            [필수 JSON 필드]
            - summary: string
            - marketStatus: string
            - recommendedBusinessCategories: string[]
            - cautionBusinessCategories: string[]
            - businessInsight: string

            위 필드명을 그대로 사용한 평평한 JSON 객체 하나만 반환하세요. 다른 키를 만들지 마세요.

            [입력 데이터]
            %s
            """.formatted(
            COMMON_RULES,
            sourceData.districtName(),
            sourceData.administrationName(),
            sourceData.administrationCode(),
            sourceData.periodCode(),
            administrationPromptFormatter.format(sourceData)
        );
    }
}

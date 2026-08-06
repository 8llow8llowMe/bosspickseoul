package com.followfollowme.nowdoboss.domainlayer.aireport.application.service.prompt;

import com.followfollowme.nowdoboss.domainlayer.aireport.application.model.AdministrationAiSourceData;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.model.CommercialAiSourceData;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.model.CommercialComparisonAiSourceData;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.model.DistrictAiSourceData;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AiReportPromptTemplate {

    private static final String COMMON_RULES = """
        당신은 서울시 상권 분석 서비스를 위한 AI 분석가입니다.
        제공된 데이터만 사용하세요.
        근거 없는 사실을 지어내지 마세요.
        창업 성공, 수익, 성장 가능성을 단정적으로 표현하지 마세요.
        응답은 반드시 한국어로 작성하세요.
        JSON 외의 문장이나 설명은 추가하지 마세요.
        """;

    private final CommercialPromptFormatter commercialPromptFormatter;
    private final CommercialComparisonPromptFormatter commercialComparisonPromptFormatter;
    private final DistrictPromptFormatter districtPromptFormatter;
    private final AdministrationPromptFormatter administrationPromptFormatter;

    public String buildCommercialPrompt(CommercialAiSourceData sourceData) {
        return """
            %s

            [대상]
            - 상권 코드: %s
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
            sourceData.commercialCode(),
            sourceData.serviceCode(),
            sourceData.periodCode(),
            commercialPromptFormatter.format(sourceData)
        );
    }

    public String buildCommercialComparisonPrompt(CommercialComparisonAiSourceData sourceData) {
        return """
            %s

            [대상]
            - 좌측 상권 코드: %s
            - 우측 상권 코드: %s
            - 서비스 코드: %s
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
            sourceData.leftCommercialCode(),
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
            - 자치구 코드: %s
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
            """.formatted(COMMON_RULES, sourceData.districtCode(), sourceData.periodCode(), districtPromptFormatter.format(sourceData));
    }

    public String buildAdministrationPrompt(AdministrationAiSourceData sourceData) {
        return """
            %s

            [대상]
            - 행정동 코드: %s
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
            sourceData.administrationCode(),
            sourceData.periodCode(),
            administrationPromptFormatter.format(sourceData)
        );
    }
}

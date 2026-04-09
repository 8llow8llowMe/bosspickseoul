package com.followfollowme.nowdoboss.domainlayer.aireport.application.service.prompt;

import com.followfollowme.nowdoboss.domainlayer.aireport.application.model.AdministrationAiSourceData;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.model.CommercialAiSourceData;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.model.DistrictAiSourceData;
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
            You are an AI analyst for a Seoul commercial insight service.
            Use only the provided data.
            Do not invent unsupported facts.
            Do not make deterministic claims about startup success, profit, or guaranteed growth.
            Return only the requested JSON payload with no extra prose.

            [Target]
            - Commercial code: %s
            - Service code: %s
            - Period code: %s

            [Required JSON Fields]
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

            [Input Data]
            %s
            """.formatted(sourceData.commercialCode(), sourceData.serviceCode(), sourceData.periodCode(), commercialPromptFormatter.format(sourceData));
    }

    public String buildDistrictPrompt(DistrictAiSourceData sourceData) {
        return """
            You are an AI analyst for a Seoul district insight service.
            Use only the provided data.
            Do not invent unsupported facts.
            Do not make deterministic claims about startup success, profit, or guaranteed growth.
            Return only the requested JSON payload with no extra prose.

            [Target]
            - District code: %s
            - Period code: %s

            [Input Data]
            %s
            """.formatted(sourceData.districtCode(), sourceData.periodCode(), districtPromptFormatter.format(sourceData));
    }

    public String buildAdministrationPrompt(AdministrationAiSourceData sourceData) {
        return """
            You are an AI analyst for a Seoul administration insight service.
            Use only the provided data.
            Do not invent unsupported facts.
            Do not make deterministic claims about startup success, profit, or guaranteed growth.
            Return only the requested JSON payload with no extra prose.

            [Target]
            - Administration code: %s
            - Period code: %s

            [Input Data]
            %s
            """.formatted(sourceData.administrationCode(), sourceData.periodCode(), administrationPromptFormatter.format(sourceData));
    }
}

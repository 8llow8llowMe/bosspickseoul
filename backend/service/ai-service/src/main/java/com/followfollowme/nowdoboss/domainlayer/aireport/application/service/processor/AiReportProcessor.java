package com.followfollowme.nowdoboss.domainlayer.aireport.application.service.processor;

import com.fasterxml.jackson.databind.JsonNode;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportErrorCode;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportException;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.CommercialAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.DistrictAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.AiLlmPort;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.AiReportCachePort;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.CommercialAnalysisQueryPort;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.DistrictAnalysisQueryPort;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.CommercialAiDraft;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.CommercialAiSourceData;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.DistrictAiDraft;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.DistrictAiSourceData;
import com.followfollowme.nowdoboss.domainlayer.aireport.global.properties.AiLlmProperties;
import java.time.LocalDateTime;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class AiReportProcessor {

    private final CommercialAnalysisQueryPort commercialAnalysisQueryPort;
    private final DistrictAnalysisQueryPort districtAnalysisQueryPort;
    private final AiLlmPort aiLlmPort;
    private final AiReportCachePort aiReportCachePort;
    private final AiLlmProperties aiLlmProperties;

    public CommercialAiReportInfo getCommercialReport(String commercialCode, String serviceCode, String periodCode) {
        long startTime = System.currentTimeMillis();
        Optional<CommercialAiReportInfo> cached = aiReportCachePort.getCommercialReport(commercialCode, serviceCode, periodCode);
        if (cached.isPresent()) {
            logReport("commercial", commercialCode, periodCode, true, startTime);
            return cached.get();
        }

        JsonNode administrationInfo = districtAnalysisQueryPort.getCommercialAdministration(commercialCode);
        String districtCode = getRequiredText(administrationInfo, "districtCode");
        String administrationCode = getRequiredText(administrationInfo, "administrationCode");

        CommercialAiSourceData sourceData = new CommercialAiSourceData(
            commercialCode,
            serviceCode,
            periodCode,
            administrationInfo,
            commercialAnalysisQueryPort.getCommercialFootTraffic(commercialCode, periodCode),
            commercialAnalysisQueryPort.getCommercialSales(commercialCode, serviceCode, periodCode),
            commercialAnalysisQueryPort.getCommercialFacility(commercialCode, periodCode),
            commercialAnalysisQueryPort.getCommercialPopulation(commercialCode, periodCode),
            commercialAnalysisQueryPort.getCommercialIncome(commercialCode, periodCode),
            commercialAnalysisQueryPort.getCommercialStore(commercialCode, serviceCode, periodCode),
            commercialAnalysisQueryPort.getCommercialSalesSummary(districtCode, administrationCode, commercialCode, serviceCode, periodCode),
            commercialAnalysisQueryPort.getCommercialIncomeSummary(districtCode, administrationCode, commercialCode, periodCode)
        );

        CommercialAiDraft draft = aiLlmPort.generateCommercialReport(sourceData);
        CommercialAiReportInfo reportInfo = new CommercialAiReportInfo(
            draft.summary(),
            draft.strengths(),
            draft.risks(),
            draft.recommendedCustomerSegments(),
            draft.recommendedOperatingHours(),
            draft.businessInsight(),
            LocalDateTime.now()
        );
        aiReportCachePort.saveCommercialReport(commercialCode, serviceCode, periodCode, reportInfo);
        logReport("commercial", commercialCode, periodCode, false, startTime);
        return reportInfo;
    }

    public DistrictAiReportInfo getDistrictReport(String districtCode, String periodCode) {
        long startTime = System.currentTimeMillis();
        Optional<DistrictAiReportInfo> cached = aiReportCachePort.getDistrictReport(districtCode, periodCode);
        if (cached.isPresent()) {
            logReport("district", districtCode, periodCode, true, startTime);
            return cached.get();
        }

        DistrictAiSourceData sourceData = new DistrictAiSourceData(
            districtCode,
            periodCode,
            districtAnalysisQueryPort.getDistrictDetail(districtCode, periodCode)
        );

        DistrictAiDraft draft = aiLlmPort.generateDistrictReport(sourceData);
        DistrictAiReportInfo reportInfo = new DistrictAiReportInfo(
            draft.summary(),
            draft.marketStatus(),
            draft.recommendedBusinessCategories(),
            draft.cautionBusinessCategories(),
            draft.businessInsight(),
            LocalDateTime.now()
        );
        aiReportCachePort.saveDistrictReport(districtCode, periodCode, reportInfo);
        logReport("district", districtCode, periodCode, false, startTime);
        return reportInfo;
    }

    private String getRequiredText(JsonNode node, String fieldName) {
        JsonNode value = node.get(fieldName);
        if (value == null || value.asText().isBlank()) {
            throw new AiReportException(AiReportErrorCode.SOURCE_DATA_UNAVAILABLE);
        }
        return value.asText();
    }

    private void logReport(String reportType, String targetCode, String periodCode, boolean cacheHit, long startTime) {
        long latencyMs = System.currentTimeMillis() - startTime;
        log.info("AI 리포트 생성 reportType={} targetCode={} periodCode={} cacheHit={} latencyMs={} llmModel={}",
            reportType, targetCode, periodCode, cacheHit, latencyMs, aiLlmProperties.model());
    }
}

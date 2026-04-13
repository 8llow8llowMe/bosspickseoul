package com.followfollowme.nowdoboss.domainlayer.aireport.application.service.prompt;

import com.followfollowme.nowdoboss.domainlayer.aireport.application.model.CommercialAiSourceData;
import java.util.StringJoiner;
import org.springframework.stereotype.Component;

@Component
public class CommercialPromptFormatter {

    public String format(CommercialAiSourceData sourceData) {
        StringJoiner joiner = new StringJoiner("\n\n");
        joiner.add(formatRegionSection(sourceData));
        joiner.add(formatFootTrafficSection(sourceData));
        joiner.add(formatSalesSection(sourceData));
        joiner.add(formatFacilitySection(sourceData));
        joiner.add(formatPopulationSection(sourceData));
        joiner.add(formatIncomeSection(sourceData));
        joiner.add(formatStoreSection(sourceData));
        joiner.add(formatSummaryComparisonSection(sourceData));
        return joiner.toString();
    }

    private String formatRegionSection(CommercialAiSourceData sourceData) {
        return """
            [지역]
            - 자치구: %s (%s)
            - 행정동: %s (%s)
            """.formatted(
            sourceData.districtName(),
            sourceData.districtCode(),
            sourceData.administrationName(),
            sourceData.administrationCode()
        );
    }

    private String formatFootTrafficSection(CommercialAiSourceData sourceData) {
        return """
            [유동인구]
            - 최대 시간대: %s
            - 최대 요일: %s
            - 최대 연령대: %s
            """.formatted(
            sourceData.peakFootTrafficTimeSlot(),
            sourceData.peakFootTrafficDayOfWeek(),
            sourceData.peakFootTrafficAgeGroup()
        );
    }

    private String formatSalesSection(CommercialAiSourceData sourceData) {
        return """
            [매출]
            - 최대 시간대: %s
            - 최대 요일: %s
            - 최대 연령대: %s
            - 비중이 가장 큰 성별/연령 조합: %s
            """.formatted(
            sourceData.peakSalesTimeSlot(),
            sourceData.peakSalesDayOfWeek(),
            sourceData.peakSalesAgeGroup(),
            sourceData.largestAgeGenderShare()
        );
    }

    private String formatFacilitySection(CommercialAiSourceData sourceData) {
        return """
            [시설]
            - 총 시설 수: %s
            - 학교 수: %s
            - 교통 시설 수: %s
            """.formatted(PromptFormatterSupport.formatNumber(sourceData.totalFacilityCount()), PromptFormatterSupport.formatNumber(sourceData.schoolCount()), PromptFormatterSupport.formatNumber(sourceData.transportationFacilityCount()));
    }

    private String formatPopulationSection(CommercialAiSourceData sourceData) {
        return """
            [거주인구]
            - 총 거주인구: %s
            - 비중이 가장 큰 연령대: %s
            """.formatted(
            PromptFormatterSupport.formatNumber(sourceData.totalResidentPopulationCount()),
            sourceData.largestResidentAgeGroup()
        );
    }

    private String formatIncomeSection(CommercialAiSourceData sourceData) {
        return """
            [소득 및 지출]
            - 월 평균 소득: %s
            - 지출 비중이 가장 큰 항목: %s
            """.formatted(
            PromptFormatterSupport.formatNumber(sourceData.averageMonthlyIncomeAmount()),
            sourceData.largestExpenseCategory()
        );
    }

    private String formatStoreSection(CommercialAiSourceData sourceData) {
        return """
            [점포 분석]
            - 총 점포 수: %s
            - 유사 업종 점포 수: %s
            - 개업 점포 수 / 개업률: %s / %s
            - 폐업 점포 수 / 폐업률: %s / %s
            - 프랜차이즈 점포 수: %s
            - 비교 업종 예시: %s
            """.formatted(PromptFormatterSupport.formatNumber(sourceData.totalStoreCount()), PromptFormatterSupport.formatNumber(sourceData.similarStoreCount()), PromptFormatterSupport.formatNumber(sourceData.openedStoreCount()), PromptFormatterSupport.formatPercent(sourceData.openingRate()), PromptFormatterSupport.formatNumber(sourceData.closedStoreCount()), PromptFormatterSupport.formatPercent(sourceData.closureRate()), PromptFormatterSupport.formatNumber(sourceData.franchiseStoreCount()), PromptFormatterSupport.formatTopList(sourceData.peerStoreSummaries(), 3, item -> item));
    }

    private String formatSummaryComparisonSection(CommercialAiSourceData sourceData) {
        return """
            [지역 비교]
            - 자치구 매출: %s
            - 행정동 매출: %s
            - 상권 매출: %s
            - 자치구 총지출: %s
            - 행정동 총지출: %s
            - 상권 총지출: %s
            """.formatted(PromptFormatterSupport.formatNumber(sourceData.districtSalesAmount()), PromptFormatterSupport.formatNumber(sourceData.administrationSalesAmount()), PromptFormatterSupport.formatNumber(sourceData.commercialSalesAmount()), PromptFormatterSupport.formatNumber(sourceData.districtExpenseAmount()), PromptFormatterSupport.formatNumber(sourceData.administrationExpenseAmount()), PromptFormatterSupport.formatNumber(sourceData.commercialExpenseAmount()));
    }
}

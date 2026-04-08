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
            [Region]
            - District: %s (%s)
            - Administration: %s (%s)
            """.formatted(
            sourceData.districtName(),
            sourceData.districtCode(),
            sourceData.administrationName(),
            sourceData.administrationCode()
        );
    }

    private String formatFootTrafficSection(CommercialAiSourceData sourceData) {
        return """
            [Foot Traffic]
            - Peak time slot: %s
            - Peak day of week: %s
            - Peak age group: %s
            """.formatted(
            sourceData.peakFootTrafficTimeSlot(),
            sourceData.peakFootTrafficDayOfWeek(),
            sourceData.peakFootTrafficAgeGroup()
        );
    }

    private String formatSalesSection(CommercialAiSourceData sourceData) {
        return """
            [Sales]
            - Peak time slot: %s
            - Peak day of week: %s
            - Peak age group: %s
            - Largest age/gender share: %s
            """.formatted(
            sourceData.peakSalesTimeSlot(),
            sourceData.peakSalesDayOfWeek(),
            sourceData.peakSalesAgeGroup(),
            sourceData.largestAgeGenderShare()
        );
    }

    private String formatFacilitySection(CommercialAiSourceData sourceData) {
        return """
            [Facilities]
            - Total facilities: %s
            - Schools: %s
            - Transportation facilities: %s
            """.formatted(PromptFormatterSupport.formatNumber(sourceData.totalFacilityCount()), PromptFormatterSupport.formatNumber(sourceData.schoolCount()), PromptFormatterSupport.formatNumber(sourceData.transportationFacilityCount()));
    }

    private String formatPopulationSection(CommercialAiSourceData sourceData) {
        return """
            [Resident Population]
            - Total residents: %s
            - Largest age group: %s
            """.formatted(
            PromptFormatterSupport.formatNumber(sourceData.totalResidentPopulationCount()),
            sourceData.largestResidentAgeGroup()
        );
    }

    private String formatIncomeSection(CommercialAiSourceData sourceData) {
        return """
            [Income and Expense]
            - Average monthly income: %s
            - Largest expense category: %s
            """.formatted(
            PromptFormatterSupport.formatNumber(sourceData.averageMonthlyIncomeAmount()),
            sourceData.largestExpenseCategory()
        );
    }

    private String formatStoreSection(CommercialAiSourceData sourceData) {
        return """
            [Store Analysis]
            - Total stores: %s
            - Similar-category stores: %s
            - Opened stores / opening rate: %s / %s
            - Closed stores / closure rate: %s / %s
            - Franchise stores: %s
            - Peer examples: %s
            """.formatted(PromptFormatterSupport.formatNumber(sourceData.totalStoreCount()), PromptFormatterSupport.formatNumber(sourceData.similarStoreCount()), PromptFormatterSupport.formatNumber(sourceData.openedStoreCount()), PromptFormatterSupport.formatPercent(sourceData.openingRate()), PromptFormatterSupport.formatNumber(sourceData.closedStoreCount()), PromptFormatterSupport.formatPercent(sourceData.closureRate()), PromptFormatterSupport.formatNumber(sourceData.franchiseStoreCount()), PromptFormatterSupport.formatTopList(sourceData.peerStoreSummaries(), 3, item -> item));
    }

    private String formatSummaryComparisonSection(CommercialAiSourceData sourceData) {
        return """
            [Regional Comparison]
            - District sales: %s
            - Administration sales: %s
            - Commercial sales: %s
            - District total expense: %s
            - Administration total expense: %s
            - Commercial total expense: %s
            """.formatted(PromptFormatterSupport.formatNumber(sourceData.districtSalesAmount()), PromptFormatterSupport.formatNumber(sourceData.administrationSalesAmount()), PromptFormatterSupport.formatNumber(sourceData.commercialSalesAmount()), PromptFormatterSupport.formatNumber(sourceData.districtExpenseAmount()), PromptFormatterSupport.formatNumber(sourceData.administrationExpenseAmount()), PromptFormatterSupport.formatNumber(sourceData.commercialExpenseAmount()));
    }
}

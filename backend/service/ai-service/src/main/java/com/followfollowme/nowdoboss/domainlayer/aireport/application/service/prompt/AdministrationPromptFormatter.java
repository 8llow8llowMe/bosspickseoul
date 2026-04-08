package com.followfollowme.nowdoboss.domainlayer.aireport.application.service.prompt;

import com.followfollowme.nowdoboss.domainlayer.aireport.application.model.AdministrationAiSourceData;
import java.util.StringJoiner;
import org.springframework.stereotype.Component;

@Component
public class AdministrationPromptFormatter {

    public String format(AdministrationAiSourceData sourceData) {
        StringJoiner joiner = new StringJoiner("\n\n");
        joiner.add(formatRegionSection(sourceData));
        joiner.add(formatCommercialsSection(sourceData));
        joiner.add(formatSalesSection(sourceData));
        joiner.add(formatStoreSection(sourceData));
        joiner.add(formatExpenseSection(sourceData));
        return joiner.toString();
    }

    private String formatRegionSection(AdministrationAiSourceData sourceData) {
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

    private String formatCommercialsSection(AdministrationAiSourceData sourceData) {
        return """
            [Commercial Areas]
            - Count: %s
            - Main areas: %s
            """.formatted(
            PromptFormatterSupport.formatNumber(sourceData.commercialCount()),
            PromptFormatterSupport.formatTopList(sourceData.commercialSummaries(), 5, item -> item)
        );
    }

    private String formatSalesSection(AdministrationAiSourceData sourceData) {
        return """
            [Top Sales Services]
            - Services: %s
            """.formatted(PromptFormatterSupport.formatTopList(sourceData.topSalesServiceSummaries(), 3, item -> item));
    }

    private String formatStoreSection(AdministrationAiSourceData sourceData) {
        return """
            [Top Store Services]
            - Services: %s
            """.formatted(PromptFormatterSupport.formatTopList(sourceData.topStoreServiceSummaries(), 3, item -> item));
    }

    private String formatExpenseSection(AdministrationAiSourceData sourceData) {
        return """
            [Expense Scale]
            - Total expense: %s
            """.formatted(PromptFormatterSupport.formatNumber(sourceData.totalExpenseAmount()));
    }
}

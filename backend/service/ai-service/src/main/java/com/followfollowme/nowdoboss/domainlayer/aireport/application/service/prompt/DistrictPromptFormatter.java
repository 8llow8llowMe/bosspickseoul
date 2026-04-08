package com.followfollowme.nowdoboss.domainlayer.aireport.application.service.prompt;

import com.followfollowme.nowdoboss.domainlayer.aireport.application.model.DistrictAiSourceData;
import java.util.StringJoiner;
import org.springframework.stereotype.Component;

@Component
public class DistrictPromptFormatter {

    public String format(DistrictAiSourceData sourceData) {
        StringJoiner joiner = new StringJoiner("\n\n");
        joiner.add(formatChangeIndicatorSection(sourceData));
        joiner.add(formatFootTrafficSection(sourceData));
        joiner.add(formatStoreSection(sourceData));
        joiner.add(formatSalesSection(sourceData));
        return joiner.toString();
    }

    private String formatChangeIndicatorSection(DistrictAiSourceData sourceData) {
        return """
            [Market Change Indicator]
            - Indicator: %s
            - Avg opened months: %s
            - Avg closed months: %s
            """.formatted(
            sourceData.changeIndicatorName(),
            sourceData.averageOpenedMonths(),
            sourceData.averageClosedMonths()
        );
    }

    private String formatFootTrafficSection(DistrictAiSourceData sourceData) {
        return """
            [Foot Traffic Trend]
            - Trend: %s
            - Dominant time slot: %s
            - Dominant gender: %s
            """.formatted(
            sourceData.footTrafficTrend(),
            sourceData.dominantTimeSlot(),
            sourceData.dominantGender()
        );
    }

    private String formatStoreSection(DistrictAiSourceData sourceData) {
        return """
            [Store Structure]
            - Top store services: %s
            - Top opening administrations: %s
            - Top closing administrations: %s
            """.formatted(
            PromptFormatterSupport.formatTopList(sourceData.topStoreServiceSummaries(), 3, item -> item),
            PromptFormatterSupport.formatTopList(sourceData.topOpenedAdministrationSummaries(), 3, item -> item),
            PromptFormatterSupport.formatTopList(sourceData.topClosedAdministrationSummaries(), 3, item -> item)
        );
    }

    private String formatSalesSection(DistrictAiSourceData sourceData) {
        return """
            [Sales Trend]
            - Top growth services: %s
            - Top sales administrations: %s
            """.formatted(
            PromptFormatterSupport.formatTopList(sourceData.topSalesServiceSummaries(), 3, item -> item),
            PromptFormatterSupport.formatTopList(sourceData.topSalesAdministrationSummaries(), 3, item -> item)
        );
    }
}

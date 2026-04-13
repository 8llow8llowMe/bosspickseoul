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

    private String formatCommercialsSection(AdministrationAiSourceData sourceData) {
        return """
            [상권 구성]
            - 상권 수: %s
            - 주요 상권: %s
            """.formatted(
            PromptFormatterSupport.formatNumber(sourceData.commercialCount()),
            PromptFormatterSupport.formatTopList(sourceData.commercialSummaries(), 5, item -> item)
        );
    }

    private String formatSalesSection(AdministrationAiSourceData sourceData) {
        return """
            [매출 상위 업종]
            - 업종 목록: %s
            """.formatted(PromptFormatterSupport.formatTopList(sourceData.topSalesServiceSummaries(), 3, item -> item));
    }

    private String formatStoreSection(AdministrationAiSourceData sourceData) {
        return """
            [점포 상위 업종]
            - 업종 목록: %s
            """.formatted(PromptFormatterSupport.formatTopList(sourceData.topStoreServiceSummaries(), 3, item -> item));
    }

    private String formatExpenseSection(AdministrationAiSourceData sourceData) {
        return """
            [지출 규모]
            - 총지출: %s
            """.formatted(PromptFormatterSupport.formatNumber(sourceData.totalExpenseAmount()));
    }
}

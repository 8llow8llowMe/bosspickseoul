package com.followfollowme.nowdoboss.domainlayer.aireport.application.service.prompt;

import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.AdministrationCommercialQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.AdministrationSalesServiceTopQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.AdministrationStoreServiceTopQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.AdministrationAiSourceData;
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
            [행정동 소속 지역]
            - 자치구: %s (%s)
            - 행정동: %s (%s)
            """.formatted(
            sourceData.districtInfo().districtCodeName(),
            sourceData.districtInfo().districtCode(),
            sourceData.districtInfo().administrationCodeName(),
            sourceData.districtInfo().administrationCode()
        );
    }

    private String formatCommercialsSection(AdministrationAiSourceData sourceData) {
        return """
            [행정동 내 상권]
            - 상권 수: %s개
            - 주요 상권: %s
            """.formatted(
            PromptFormatterSupport.formatNumber(sourceData.commercials().size()),
            PromptFormatterSupport.formatTopList(sourceData.commercials(), 5, this::formatCommercial)
        );
    }

    private String formatSalesSection(AdministrationAiSourceData sourceData) {
        return """
            [매출 상위 업종]
            - 상위 업종: %s
            """.formatted(PromptFormatterSupport.formatTopList(sourceData.detail().sales().topSalesServices(), 3, this::formatTopSalesService));
    }

    private String formatStoreSection(AdministrationAiSourceData sourceData) {
        return """
            [점포 상위 업종]
            - 상위 업종: %s
            """.formatted(PromptFormatterSupport.formatTopList(sourceData.detail().store().topStoreServices(), 3, this::formatTopStoreService));
    }

    private String formatExpenseSection(AdministrationAiSourceData sourceData) {
        return """
            [지출 규모]
            - 총 지출액: %s원
            """.formatted(PromptFormatterSupport.formatNumber(sourceData.detail().income().totalExpenseAmount()));
    }

    private String formatCommercial(AdministrationCommercialQueryResult commercial) {
        return "%s(%s)".formatted(commercial.commercialName(), commercial.commercialCode());
    }

    private String formatTopSalesService(AdministrationSalesServiceTopQueryResult item) {
        return "%s(월매출 %s원, 증감률 %s)".formatted(
            item.serviceName(),
            PromptFormatterSupport.formatNumber(item.monthlySalesAmount()),
            PromptFormatterSupport.formatPercent(item.salesChangeRate())
        );
    }

    private String formatTopStoreService(AdministrationStoreServiceTopQueryResult item) {
        return "%s(점포 %s개, 개업률 %s, 폐업률 %s)".formatted(
            item.serviceName(),
            PromptFormatterSupport.formatNumber(item.totalStoreCount()),
            PromptFormatterSupport.formatPercent(item.openingRate()),
            PromptFormatterSupport.formatPercent(item.closureRate())
        );
    }
}

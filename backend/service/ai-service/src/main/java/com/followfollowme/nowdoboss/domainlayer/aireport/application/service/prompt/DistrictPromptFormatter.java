package com.followfollowme.nowdoboss.domainlayer.aireport.application.service.prompt;

import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.DistrictAiSourceData;
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
            [상권 변화 지표]
            - 변화 지표: %s
            - 평균 개업 개월 수: %s개월
            - 평균 폐업 개월 수: %s개월
            """.formatted(
            sourceData.districtDetail().changeIndicator().changeIndicatorName(),
            sourceData.districtDetail().changeIndicator().averageOpenedMonths(),
            sourceData.districtDetail().changeIndicator().averageClosedMonths()
        );
    }

    private String formatFootTrafficSection(DistrictAiSourceData sourceData) {
        return """
            [유동인구 추이]
            - 추세: %s
            - 우세 시간대: %s
            - 우세 성별: %s
            """.formatted(
            sourceData.districtDetail().footTraffic().periodTrend(),
            sourceData.districtDetail().footTraffic().timeSlot().dominantTimeSlotType(),
            sourceData.districtDetail().footTraffic().gender().dominantGenderType()
        );
    }

    private String formatStoreSection(DistrictAiSourceData sourceData) {
        return """
            [점포 현황]
            - 점포 수 상위 업종: %s
            - 개업 상위 행정동: %s
            - 폐업 상위 행정동: %s
            """.formatted(
            PromptFormatterSupport.formatTopList(
                sourceData.districtDetail().store().topStoreServices(),
                3,
                item -> "%s(%s개)".formatted(item.serviceName(), PromptFormatterSupport.formatNumber(item.totalStoreCount()))
            ),
            PromptFormatterSupport.formatTopList(
                sourceData.districtDetail().store().topOpenedAdministrations(),
                3,
                item -> "%s(개업 %s개, 개업률 %s)".formatted(
                    item.administrationName(),
                    PromptFormatterSupport.formatNumber(item.openedStoreCount()),
                    PromptFormatterSupport.formatPercent(item.openingRate())
                )
            ),
            PromptFormatterSupport.formatTopList(
                sourceData.districtDetail().store().topClosedAdministrations(),
                3,
                item -> "%s(폐업 %s개, 폐업률 %s)".formatted(
                    item.administrationName(),
                    PromptFormatterSupport.formatNumber(item.closedStoreCount()),
                    PromptFormatterSupport.formatPercent(item.closureRate())
                )
            )
        );
    }

    private String formatSalesSection(DistrictAiSourceData sourceData) {
        return """
            [매출 현황]
            - 매출 증가 상위 업종: %s
            - 매출 상위 행정동: %s
            """.formatted(
            PromptFormatterSupport.formatTopList(
                sourceData.districtDetail().sales().topSalesServices(),
                3,
                item -> "%s(증감률 %s)".formatted(item.serviceName(), PromptFormatterSupport.formatPercent(item.salesChangeRate()))
            ),
            PromptFormatterSupport.formatTopList(
                sourceData.districtDetail().sales().topSalesAdministrations(),
                3,
                item -> "%s(매출 %s원, 증감률 %s)".formatted(
                    item.administrationName(),
                    PromptFormatterSupport.formatNumber(item.totalSalesAmount()),
                    PromptFormatterSupport.formatPercent(item.salesChangeRate())
                )
            )
        );
    }
}

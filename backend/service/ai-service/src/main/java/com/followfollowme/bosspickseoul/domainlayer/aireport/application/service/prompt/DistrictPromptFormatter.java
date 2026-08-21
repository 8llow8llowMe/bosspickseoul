package com.followfollowme.bosspickseoul.domainlayer.aireport.application.service.prompt;

import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.DistrictAiSourceData;
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
            - 지표명: %s
            - 평균 영업 개월 수: %s
            - 평균 폐업 개월 수: %s
            """.formatted(
            sourceData.changeIndicatorName(),
            sourceData.averageOpenedMonths(),
            sourceData.averageClosedMonths()
        );
    }

    private String formatFootTrafficSection(DistrictAiSourceData sourceData) {
        return """
            [유동인구 흐름]
            - 추세: %s
            - 우세 시간대: %s
            - 우세 성별: %s
            """.formatted(
            sourceData.footTrafficTrend(),
            sourceData.dominantTimeSlot(),
            sourceData.dominantGender()
        );
    }

    private String formatStoreSection(DistrictAiSourceData sourceData) {
        return """
            [점포 구조]
            - 점포 수 상위 업종: %s
            - 개업 상위 행정동: %s
            - 폐업 상위 행정동: %s
            """.formatted(
            PromptFormatterSupport.formatTopList(sourceData.topStoreServiceSummaries(), 3, item -> item),
            PromptFormatterSupport.formatTopList(sourceData.topOpenedAdministrationSummaries(), 3, item -> item),
            PromptFormatterSupport.formatTopList(sourceData.topClosedAdministrationSummaries(), 3, item -> item)
        );
    }

    private String formatSalesSection(DistrictAiSourceData sourceData) {
        return """
            [매출 흐름]
            - 성장 상위 업종: %s
            - 매출 상위 행정동: %s
            """.formatted(
            PromptFormatterSupport.formatTopList(sourceData.topSalesServiceSummaries(), 3, item -> item),
            PromptFormatterSupport.formatTopList(sourceData.topSalesAdministrationSummaries(), 3, item -> item)
        );
    }
}

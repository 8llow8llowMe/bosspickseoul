package com.followfollowme.bosspickseoul.domainlayer.aireport.application.service.prompt;

import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.CommercialComparisonAiSourceData;
import java.util.List;
import java.util.StringJoiner;
import org.springframework.stereotype.Component;

@Component
public class CommercialComparisonPromptFormatter {

    public String format(CommercialComparisonAiSourceData sourceData) {
        StringJoiner joiner = new StringJoiner("\n\n");
        joiner.add(formatTargetSection(sourceData));
        joiner.add(formatSummarySection(sourceData));
        joiner.add(formatMetricSection("매출 비교", sourceData.salesMetricSummaries(), 5));
        joiner.add(formatMetricSection("유동인구 비교", sourceData.footTrafficMetricSummaries(), 5));
        joiner.add(formatMetricSection("점포 비교", sourceData.storeMetricSummaries(), 5));
        joiner.add(formatMetricSection("소비력 비교", sourceData.spendingMetricSummaries(), 5));
        joiner.add(formatMetricSection("거주인구 비교", sourceData.residentPopulationMetricSummaries(), 5));
        joiner.add(formatMetricSection("시설 비교", sourceData.facilityMetricSummaries(), 5));
        joiner.add(formatMetricSection("매출 시간대 분포 비교", sourceData.salesTimeSlotMetricSummaries(), 6));
        joiner.add(formatMetricSection("매출 연령대 분포 비교", sourceData.salesAgeMetricSummaries(), 6));
        joiner.add(formatMetricSection("매출 연령/성별 분포 비교", sourceData.salesAgeGenderMetricSummaries(), 12));
        joiner.add(formatMetricSection("유동인구 시간대 분포 비교", sourceData.footTrafficTimeSlotMetricSummaries(), 6));
        joiner.add(formatMetricSection("유동인구 연령대 분포 비교", sourceData.footTrafficAgeMetricSummaries(), 6));
        joiner.add(formatMetricSection("유동인구 연령/성별 분포 비교", sourceData.footTrafficAgeGenderMetricSummaries(), 12));
        return joiner.toString();
    }

    private String formatTargetSection(CommercialComparisonAiSourceData sourceData) {
        return """
            [비교 대상]
            - 좌측 상권: %s (%s, %s)
            - 우측 상권: %s (%s, %s)
            - 서비스 코드: %s
            - 기준 분기: %s
            """.formatted(
            sourceData.leftCommercialName(),
            sourceData.leftDistrictName(),
            sourceData.leftAdministrationName(),
            sourceData.rightCommercialName(),
            sourceData.rightDistrictName(),
            sourceData.rightAdministrationName(),
            sourceData.serviceCode(),
            sourceData.periodCode()
        );
    }

    private String formatSummarySection(CommercialComparisonAiSourceData sourceData) {
        return """
            [비교 요약]
            - 전체 요약: %s
            - 추천 방향: %s
            - 추천 이유: %s
            - 주의 사항: %s
            - 강세 시간대: %s
            - 핵심 연령대: %s
            - 업종 적합도 요약: %s
            - 주요 하이라이트: %s
            """.formatted(
            sourceData.comparisonSummary(),
            sourceData.recommendedSide(),
            formatList(sourceData.recommendedReasons(), 3),
            formatList(sourceData.cautionPoints(), 3),
            formatList(sourceData.dominantTimeSlots(), 4),
            formatList(sourceData.dominantAgeGroups(), 4),
            sourceData.businessFitSummary(),
            formatList(sourceData.comparisonHighlights(), 4)
        );
    }

    private String formatMetricSection(String title, List<String> metrics, int limit) {
        return """
            [%s]
            - %s
            """.formatted(title, formatList(metrics, limit));
    }

    private String formatList(List<String> items, int limit) {
        return PromptFormatterSupport.formatTopList(items, limit, item -> item);
    }
}

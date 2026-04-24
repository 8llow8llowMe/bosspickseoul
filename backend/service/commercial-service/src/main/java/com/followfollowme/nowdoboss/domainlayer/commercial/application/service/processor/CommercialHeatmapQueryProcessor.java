package com.followfollowme.nowdoboss.domainlayer.commercial.application.service.processor;

import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficByDayOfWeekInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.heatmap.CommercialAllMetricScoresInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.heatmap.CommercialHeatmapScoreInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.income.CommercialExpenseByCategoryInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales.CommercialSalesByDayOfWeekInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.model.CommercialHeatmapMetricType;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.model.CommercialHeatmapSource;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.model.MetricRange;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.port.out.ChangeCommercialRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.commercial.domain.enums.ChangeIndicatorCode;
import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.ChangeCommercial;
import com.followfollowme.nowdoboss.shared.enums.GradeLevel;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CommercialHeatmapQueryProcessor {

    private static final double NORMALIZED_DEFAULT_WHEN_RANGE_COLLAPSED = 50D;
    private static final double NORMALIZED_MIN = 0D;
    private static final double NORMALIZED_MAX = 100D;

    private static final double RISK_MULTIPLIER_OPPORTUNITY = 0.8D;
    private static final double RISK_MULTIPLIER_ENTRENCHED = 1.1D;
    private static final double RISK_MULTIPLIER_UNSTABLE = 1.2D;
    private static final double RISK_MULTIPLIER_DEFAULT = 1.0D;

    private final CommercialQueryProcessor commercialQueryProcessor;
    private final ChangeCommercialRepositoryPort changeCommercialRepositoryPort;

    public List<CommercialHeatmapScoreInfo> getHeatmapScores(
        String periodCode, String serviceCode, List<String> commercialCodes, CommercialHeatmapMetricType metricType
    ) {
        return getAllMetricScores(periodCode, serviceCode, commercialCodes).stream()
            .map(entry -> entry.scoresByMetric().get(metricType))
            .filter(Objects::nonNull)
            .toList();
    }

    public List<CommercialAllMetricScoresInfo> getAllMetricScores(
        String periodCode, String serviceCode, List<String> commercialCodes
    ) {
        List<CommercialHeatmapSource> sources = loadSources(periodCode, serviceCode, commercialCodes);
        Map<CommercialHeatmapMetricType, MetricRange> rangeByMetric = computeRanges(sources);

        List<CommercialAllMetricScoresInfo> result = new ArrayList<>(sources.size());
        for (CommercialHeatmapSource source : sources) {
            result.add(buildAllMetricScores(source, rangeByMetric));
        }
        return result;
    }

    private List<CommercialHeatmapSource> loadSources(
        String periodCode, String serviceCode, List<String> commercialCodes
    ) {
        Map<String, ChangeCommercial> changeByCode = changeCommercialRepositoryPort
            .findAllByPeriodCodeAndCommercialCodeIn(periodCode, commercialCodes)
            .stream()
            .collect(Collectors.toMap(ChangeCommercial::commercialCode, change -> change));

        return commercialCodes.stream()
            .map(code -> buildSource(periodCode, serviceCode, code, changeByCode.get(code)))
            .toList();
    }

    private CommercialHeatmapSource buildSource(
        String periodCode, String serviceCode, String commercialCode, ChangeCommercial change
    ) {
        try {
            var sales = commercialQueryProcessor
                .getSalesByPeriodCodeAndCommercialCodeAndServiceCode(periodCode, commercialCode, serviceCode);
            return new CommercialHeatmapSource(
                commercialCode,
                sales.commercialName(),
                sales,
                commercialQueryProcessor.getFootTrafficByPeriodCodeAndCommercialCode(periodCode, commercialCode),
                commercialQueryProcessor
                    .getStoreByPeriodCodeAndCommercialCodeAndServiceCode(periodCode, commercialCode, serviceCode),
                commercialQueryProcessor.getPopulationByPeriodAndCommercialCode(periodCode, commercialCode),
                commercialQueryProcessor.getIncomeByPeriodCodeAndCommercialCode(periodCode, commercialCode),
                commercialQueryProcessor.getFacilityByPeriodAndCommercialCode(periodCode, commercialCode),
                change
            );
        } catch (IllegalArgumentException exception) {
            return CommercialHeatmapSource.empty(commercialCode);
        }
    }

    private Map<CommercialHeatmapMetricType, MetricRange> computeRanges(List<CommercialHeatmapSource> sources) {
        Map<CommercialHeatmapMetricType, MetricRange> ranges = new EnumMap<>(CommercialHeatmapMetricType.class);
        for (CommercialHeatmapMetricType metric : CommercialHeatmapMetricType.values()) {
            List<Double> rawValues = sources.stream()
                .map(source -> computeRawScore(metric, source))
                .filter(Objects::nonNull)
                .toList();
            if (rawValues.isEmpty()) {
                ranges.put(metric, MetricRange.EMPTY);
                continue;
            }
            double min = rawValues.stream().min(Comparator.naturalOrder()).orElse(0D);
            double max = rawValues.stream().max(Comparator.naturalOrder()).orElse(0D);
            ranges.put(metric, new MetricRange(min, max));
        }
        return ranges;
    }

    private CommercialAllMetricScoresInfo buildAllMetricScores(
        CommercialHeatmapSource source, Map<CommercialHeatmapMetricType, MetricRange> rangeByMetric
    ) {
        Map<CommercialHeatmapMetricType, CommercialHeatmapScoreInfo> scoresByMetric =
            new EnumMap<>(CommercialHeatmapMetricType.class);

        for (CommercialHeatmapMetricType metric : CommercialHeatmapMetricType.values()) {
            Double normalized = normalize(computeRawScore(metric, source), rangeByMetric.get(metric));
            scoresByMetric.put(metric, CommercialHeatmapScoreInfo.builder()
                .commercialCode(source.commercialCode())
                .commercialName(source.commercialName())
                .metricType(metric.toScoreMetadata())
                .score(normalized)
                .grade(toGrade(normalized))
                .summaryLabel(buildSummaryLabel(metric, normalized))
                .build());
        }

        return CommercialAllMetricScoresInfo.builder()
            .commercialCode(source.commercialCode())
            .commercialName(source.commercialName())
            .scoresByMetric(scoresByMetric)
            .build();
    }

    private Double computeRawScore(CommercialHeatmapMetricType metricType, CommercialHeatmapSource source) {
        if (!source.hasAllMetrics()) {
            return null;
        }
        return switch (metricType) {
            case OPPORTUNITY_SCORE -> computeOpportunity(source);
            case RISK_SCORE -> computeRisk(source) * resolveRiskMultiplier(source.changeCommercial());
            case CONGESTION_SCORE -> computeCongestion(source);
            case RESIDENT_POPULATION_SCORE -> computeResidentPopulation(source);
        };
    }

    private double computeOpportunity(CommercialHeatmapSource source) {
        return totalSalesAmount(source.sales().amountByDayOfWeekInfo()) * 0.35
            + totalExpenseAmount(source.income().expenseByCategoryInfo()) * 0.20
            + totalFootTraffic(source.footTraffic().byDayOfWeekInfo()) * 0.20
            + source.store().openingRate() * 1000D * 0.15
            + source.population().byAgeInfo().totalResidentPopulation() * 0.10;
    }

    private double computeRisk(CommercialHeatmapSource source) {
        return source.store().closureRate() * 1000D * 0.45
            + source.store().similarStoreCount() * 0.20
            + source.store().totalStoreCount() * 0.15
            + source.sales().amountByTimeSlotInfo().salesAmountTime00To06() * 0.10
            + source.sales().amountByTimeSlotInfo().salesAmountTime21To24() * 0.10;
    }

    private double computeCongestion(CommercialHeatmapSource source) {
        return totalFootTraffic(source.footTraffic().byDayOfWeekInfo()) * 0.50
            + source.store().totalStoreCount() * 0.25
            + source.store().similarStoreCount() * 0.25;
    }

    private double computeResidentPopulation(CommercialHeatmapSource source) {
        return source.population().byAgeInfo().totalResidentPopulation() * 0.80
            + source.income().averageIncomeInfo().monthlyAverageIncomeAmount() * 0.20;
    }

    private double resolveRiskMultiplier(ChangeCommercial change) {
        if (change == null) {
            return RISK_MULTIPLIER_DEFAULT;
        }
        ChangeIndicatorCode indicator = ChangeIndicatorCode.fromCode(change.changeIndicatorCode());
        if (indicator == null) {
            return RISK_MULTIPLIER_DEFAULT;
        }
        return switch (indicator) {
            case LH -> RISK_MULTIPLIER_OPPORTUNITY;
            case HL -> RISK_MULTIPLIER_ENTRENCHED;
            case HH, LL -> RISK_MULTIPLIER_UNSTABLE;
        };
    }

    private double totalSalesAmount(CommercialSalesByDayOfWeekInfo info) {
        return info.mondaySalesAmount() + info.tuesdaySalesAmount() + info.wednesdaySalesAmount()
            + info.thursdaySalesAmount() + info.fridaySalesAmount() + info.saturdaySalesAmount() + info.sundaySalesAmount();
    }

    private double totalFootTraffic(CommercialFootTrafficByDayOfWeekInfo info) {
        return info.mondayFootTraffic() + info.tuesdayFootTraffic() + info.wednesdayFootTraffic()
            + info.thursdayFootTraffic() + info.fridayFootTraffic() + info.saturdayFootTraffic() + info.sundayFootTraffic();
    }

    private double totalExpenseAmount(CommercialExpenseByCategoryInfo info) {
        return info.groceryExpenseAmount() + info.clothingExpenseAmount() + info.medicalExpenseAmount()
            + info.householdExpenseAmount() + info.transportationExpenseAmount() + info.leisureExpenseAmount()
            + info.cultureExpenseAmount() + info.educationExpenseAmount() + info.entertainmentExpenseAmount();
    }

    private Double normalize(Double rawScore, MetricRange range) {
        if (rawScore == null || range == null) {
            return null;
        }
        if (range.isCollapsed()) {
            return NORMALIZED_DEFAULT_WHEN_RANGE_COLLAPSED;
        }
        double normalized = ((rawScore - range.min()) / (range.max() - range.min())) * NORMALIZED_MAX;
        return Math.max(NORMALIZED_MIN, Math.min(NORMALIZED_MAX, normalized));
    }

    private String toGrade(Double score) {
        return GradeLevel.fromScore(score).name();
    }

    private String buildSummaryLabel(CommercialHeatmapMetricType metricType, Double score) {
        GradeLevel grade = GradeLevel.fromScore(score);
        if (grade == GradeLevel.INSUFFICIENT) {
            return "데이터 부족";
        }
        String gradeWord = grade == GradeLevel.HIGH ? "높음" : grade == GradeLevel.MEDIUM ? "보통" : "낮음";
        return switch (metricType) {
            case OPPORTUNITY_SCORE -> "기회도 " + gradeWord;
            case RISK_SCORE -> "위험도 " + gradeWord;
            case CONGESTION_SCORE -> "혼잡도 " + gradeWord;
            case RESIDENT_POPULATION_SCORE -> "거주 수요 " + gradeWord;
        };
    }
}

package com.followfollowme.nowdoboss.domainlayer.commercial.application.service.processor;

import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.facility.CommercialFacilityInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficByDayOfWeekInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.heatmap.CommercialAllMetricScoresInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.heatmap.CommercialHeatmapScoreInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.income.CommercialExpenseByCategoryInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.income.CommercialIncomeAndExpenseInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.population.CommercialResidentPopulationInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales.CommercialSalesByDayOfWeekInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales.CommercialSalesInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.summary.CommercialStoreAnalysisInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.model.CommercialHeatmapMetricType;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CommercialHeatmapQueryProcessor {

    private final CommercialQueryProcessor commercialQueryProcessor;

    public List<CommercialHeatmapScoreInfo> getHeatmapScores(
        String periodCode,
        String serviceCode,
        List<String> commercialCodes,
        CommercialHeatmapMetricType metricType
    ) {
        return getAllMetricScores(periodCode, serviceCode, commercialCodes).stream()
            .map(entry -> entry.scoresByMetric().get(metricType))
            .filter(Objects::nonNull)
            .toList();
    }

    public List<CommercialAllMetricScoresInfo> getAllMetricScores(
        String periodCode,
        String serviceCode,
        List<String> commercialCodes
    ) {
        List<HeatmapSource> sources = commercialCodes.stream()
            .map(code -> buildSource(periodCode, serviceCode, code))
            .toList();

        Map<CommercialHeatmapMetricType, MinMax> rangeByMetric = buildRanges(sources);

        List<CommercialAllMetricScoresInfo> result = new ArrayList<>(sources.size());
        for (HeatmapSource source : sources) {
            Map<CommercialHeatmapMetricType, CommercialHeatmapScoreInfo> scoresByMetric =
                new EnumMap<>(CommercialHeatmapMetricType.class);

            for (CommercialHeatmapMetricType metric : CommercialHeatmapMetricType.values()) {
                Double raw = computeRawScore(metric, source);
                MinMax range = rangeByMetric.get(metric);
                Double normalized = range == null ? null : normalize(raw, range.min(), range.max());

                scoresByMetric.put(metric, CommercialHeatmapScoreInfo.builder()
                    .commercialCode(source.commercialCode())
                    .commercialName(source.commercialCode())
                    .metricType(metric.toScoreMetadata())
                    .score(normalized)
                    .grade(toGrade(normalized))
                    .summaryLabel(buildSummaryLabel(metric, normalized))
                    .build());
            }

            result.add(CommercialAllMetricScoresInfo.builder()
                .commercialCode(source.commercialCode())
                .scoresByMetric(scoresByMetric)
                .build());
        }

        return result;
    }

    private Map<CommercialHeatmapMetricType, MinMax> buildRanges(List<HeatmapSource> sources) {
        Map<CommercialHeatmapMetricType, MinMax> ranges = new EnumMap<>(CommercialHeatmapMetricType.class);
        for (CommercialHeatmapMetricType metric : CommercialHeatmapMetricType.values()) {
            List<Double> rawValues = sources.stream()
                .map(source -> computeRawScore(metric, source))
                .filter(Objects::nonNull)
                .toList();
            if (rawValues.isEmpty()) {
                ranges.put(metric, new MinMax(0D, 0D));
                continue;
            }
            double min = rawValues.stream().min(Comparator.naturalOrder()).orElse(0D);
            double max = rawValues.stream().max(Comparator.naturalOrder()).orElse(0D);
            ranges.put(metric, new MinMax(min, max));
        }
        return ranges;
    }

    private HeatmapSource buildSource(String periodCode, String serviceCode, String commercialCode) {
        try {
            return new HeatmapSource(
                commercialCode,
                commercialQueryProcessor.getSalesByPeriodCodeAndCommercialCodeAndServiceCode(periodCode, commercialCode, serviceCode),
                commercialQueryProcessor.getFootTrafficByPeriodCodeAndCommercialCode(periodCode, commercialCode),
                commercialQueryProcessor.getStoreByPeriodCodeAndCommercialCodeAndServiceCode(periodCode, commercialCode, serviceCode),
                commercialQueryProcessor.getPopulationByPeriodAndCommercialCode(periodCode, commercialCode),
                commercialQueryProcessor.getIncomeByPeriodCodeAndCommercialCode(periodCode, commercialCode),
                commercialQueryProcessor.getFacilityByPeriodAndCommercialCode(periodCode, commercialCode)
            );
        } catch (IllegalArgumentException exception) {
            return new HeatmapSource(commercialCode, null, null, null, null, null, null);
        }
    }

    private Double computeRawScore(CommercialHeatmapMetricType metricType, HeatmapSource source) {
        if (source.sales() == null || source.footTraffic() == null || source.store() == null || source.population() == null
            || source.income() == null || source.facility() == null) {
            return null;
        }

        return switch (metricType) {
            case OPPORTUNITY_SCORE -> totalSalesAmount(source.sales().amountByDayOfWeekInfo()) * 0.35
                + totalExpenseAmount(source.income().expenseByCategoryInfo()) * 0.2
                + totalFootTraffic(source.footTraffic().byDayOfWeekInfo()) * 0.2
                + source.store().openingRate() * 1000D * 0.15
                + source.population().byAgeInfo().totalResidentPopulation() * 0.1;
            case RISK_SCORE -> source.store().closureRate() * 1000D * 0.45
                + source.store().similarStoreCount() * 0.2
                + source.store().totalStoreCount() * 0.15
                + source.sales().amountByTimeSlotInfo().salesAmountTime00To06() * 0.1
                + source.sales().amountByTimeSlotInfo().salesAmountTime21To24() * 0.1;
            case CONGESTION_SCORE -> totalFootTraffic(source.footTraffic().byDayOfWeekInfo()) * 0.5
                + source.store().totalStoreCount() * 0.25
                + source.store().similarStoreCount() * 0.25;
            case RESIDENT_POPULATION_SCORE -> source.population().byAgeInfo().totalResidentPopulation() * 0.8
                + source.income().averageIncomeInfo().monthlyAverageIncomeAmount() * 0.2;
        };
    }

    private double totalSalesAmount(CommercialSalesByDayOfWeekInfo info) {
        return info.mondaySalesAmount() + info.tuesdaySalesAmount() + info.wednesdaySalesAmount() + info.thursdaySalesAmount()
            + info.fridaySalesAmount() + info.saturdaySalesAmount() + info.sundaySalesAmount();
    }

    private double totalFootTraffic(CommercialFootTrafficByDayOfWeekInfo info) {
        return info.mondayFootTraffic() + info.tuesdayFootTraffic() + info.wednesdayFootTraffic() + info.thursdayFootTraffic()
            + info.fridayFootTraffic() + info.saturdayFootTraffic() + info.sundayFootTraffic();
    }

    private double totalExpenseAmount(CommercialExpenseByCategoryInfo info) {
        return info.groceryExpenseAmount() + info.clothingExpenseAmount() + info.medicalExpenseAmount()
            + info.householdExpenseAmount() + info.transportationExpenseAmount() + info.leisureExpenseAmount()
            + info.cultureExpenseAmount() + info.educationExpenseAmount() + info.entertainmentExpenseAmount();
    }

    private Double normalize(Double rawScore, double min, double max) {
        if (rawScore == null) {
            return null;
        }
        if (Double.compare(min, max) == 0) {
            return 50D;
        }
        double normalized = ((rawScore - min) / (max - min)) * 100D;
        return Math.max(0D, Math.min(100D, normalized));
    }

    private String toGrade(Double score) {
        if (score == null) {
            return "INSUFFICIENT";
        }
        if (score >= 70D) {
            return "HIGH";
        }
        if (score >= 40D) {
            return "MEDIUM";
        }
        return "LOW";
    }

    private String buildSummaryLabel(CommercialHeatmapMetricType metricType, Double score) {
        if (score == null) {
            return "데이터 부족";
        }
        return switch (metricType) {
            case OPPORTUNITY_SCORE -> score >= 70D ? "기회도 높음" : score >= 40D ? "기회도 보통" : "기회도 낮음";
            case RISK_SCORE -> score >= 70D ? "위험도 높음" : score >= 40D ? "위험도 보통" : "위험도 낮음";
            case CONGESTION_SCORE -> score >= 70D ? "혼잡도 높음" : score >= 40D ? "혼잡도 보통" : "혼잡도 낮음";
            case RESIDENT_POPULATION_SCORE -> score >= 70D ? "거주 수요 높음" : score >= 40D ? "거주 수요 보통" : "거주 수요 낮음";
        };
    }

    private record HeatmapSource(
        String commercialCode,
        CommercialSalesInfo sales,
        CommercialFootTrafficInfo footTraffic,
        CommercialStoreAnalysisInfo store,
        CommercialResidentPopulationInfo population,
        CommercialIncomeAndExpenseInfo income,
        CommercialFacilityInfo facility
    ) {
    }

    private record MinMax(double min, double max) {
    }
}

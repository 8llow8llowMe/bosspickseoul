package com.followfollowme.nowdoboss.domainlayer.commercial.application.model;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import java.util.EnumMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

class CandidatePresetTypeTest {

    @ParameterizedTest
    @EnumSource(CandidatePresetType.class)
    void weightsWithPriorityNormalizeToOne(CandidatePresetType preset) {
        Map<CommercialHeatmapMetricType, Double> weights = preset.weightsWithPriority(null);

        double total = weights.values().stream().mapToDouble(Double::doubleValue).sum();

        assertThat(total).isCloseTo(1.0D, within(1e-9));
    }

    @ParameterizedTest
    @EnumSource(CandidatePresetType.class)
    void priorityMetricGetsHigherWeightAfterBoost(CandidatePresetType preset) {
        CommercialHeatmapMetricType priority = CommercialHeatmapMetricType.OPPORTUNITY_SCORE;
        Map<CommercialHeatmapMetricType, Double> baseline = preset.weightsWithPriority(null);
        Map<CommercialHeatmapMetricType, Double> boosted = preset.weightsWithPriority(priority);

        boolean increasedOrMax = boosted.get(priority) >= baseline.get(priority);

        assertThat(increasedOrMax).isTrue();
        assertThat(boosted.values().stream().mapToDouble(Double::doubleValue).sum()).isCloseTo(1.0D, within(1e-9));
    }

    @Test
    void compositeScoreInvertsRisk() {
        Map<CommercialHeatmapMetricType, Double> scores = new EnumMap<>(CommercialHeatmapMetricType.class);
        scores.put(CommercialHeatmapMetricType.OPPORTUNITY_SCORE, 50D);
        scores.put(CommercialHeatmapMetricType.RISK_SCORE, 100D);
        scores.put(CommercialHeatmapMetricType.CONGESTION_SCORE, 50D);
        scores.put(CommercialHeatmapMetricType.RESIDENT_POPULATION_SCORE, 50D);

        double composite = CandidatePresetType.STABLE_LOW_RISK.computeComposite(scores, null);

        assertThat(composite).isLessThan(50D);
    }

    @Test
    void compositeScoreReturnsZeroToHundred() {
        Map<CommercialHeatmapMetricType, Double> allHundred = new EnumMap<>(CommercialHeatmapMetricType.class);
        for (CommercialHeatmapMetricType metric : CommercialHeatmapMetricType.values()) {
            allHundred.put(metric, 100D);
        }

        double composite = CandidatePresetType.BALANCED.computeComposite(allHundred, null);

        assertThat(composite).isBetween(0D, 100D);
    }

    @Test
    void compositeHandlesMissingMetricGracefully() {
        Map<CommercialHeatmapMetricType, Double> scores = new EnumMap<>(CommercialHeatmapMetricType.class);
        scores.put(CommercialHeatmapMetricType.OPPORTUNITY_SCORE, 80D);

        double composite = CandidatePresetType.BALANCED.computeComposite(scores, null);

        assertThat(composite).isBetween(0D, 100D);
    }
}

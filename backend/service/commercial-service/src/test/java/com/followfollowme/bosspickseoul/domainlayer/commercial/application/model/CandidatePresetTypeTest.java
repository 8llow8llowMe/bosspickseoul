package com.followfollowme.bosspickseoul.domainlayer.commercial.application.model;

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

    @Test
    void compositeScoreEmptyScores_returnsZero() {
        Map<CommercialHeatmapMetricType, Double> scores = new EnumMap<>(CommercialHeatmapMetricType.class);

        double composite = CandidatePresetType.BALANCED.computeComposite(scores, null);

        assertThat(composite).isEqualTo(0D);
    }

    @Test
    void aggressivePreset_opportunityWeightHigherThanStable() {
        Map<CommercialHeatmapMetricType, Double> aggressiveWeights =
            CandidatePresetType.AGGRESSIVE_OPPORTUNITY.weightsWithPriority(null);
        Map<CommercialHeatmapMetricType, Double> stableWeights =
            CandidatePresetType.STABLE_LOW_RISK.weightsWithPriority(null);

        assertThat(aggressiveWeights.get(CommercialHeatmapMetricType.OPPORTUNITY_SCORE))
            .isGreaterThan(stableWeights.get(CommercialHeatmapMetricType.OPPORTUNITY_SCORE));
    }

    @Test
    void lowBudgetPreset_residentPopulationWeightHighestAmongAll() {
        Map<CommercialHeatmapMetricType, Double> weights =
            CandidatePresetType.LOW_BUDGET_RESIDENT.weightsWithPriority(null);

        double residentWeight = weights.get(CommercialHeatmapMetricType.RESIDENT_POPULATION_SCORE);
        double maxOther = weights.entrySet().stream()
            .filter(e -> e.getKey() != CommercialHeatmapMetricType.RESIDENT_POPULATION_SCORE)
            .mapToDouble(Map.Entry::getValue)
            .max().orElse(0D);

        assertThat(residentWeight).isGreaterThan(maxOther);
    }

    @ParameterizedTest
    @EnumSource(CandidatePresetType.class)
    void allScoresHundred_compositeIsHundred(CandidatePresetType preset) {
        Map<CommercialHeatmapMetricType, Double> allHundredExceptRisk = new EnumMap<>(CommercialHeatmapMetricType.class);
        allHundredExceptRisk.put(CommercialHeatmapMetricType.OPPORTUNITY_SCORE, 100D);
        allHundredExceptRisk.put(CommercialHeatmapMetricType.RISK_SCORE, 0D);  // 0 risk → 100 inverted
        allHundredExceptRisk.put(CommercialHeatmapMetricType.CONGESTION_SCORE, 100D);
        allHundredExceptRisk.put(CommercialHeatmapMetricType.RESIDENT_POPULATION_SCORE, 100D);

        double composite = preset.computeComposite(allHundredExceptRisk, null);

        assertThat(composite).isCloseTo(100D, within(1e-9));
    }

    @ParameterizedTest
    @EnumSource(CandidatePresetType.class)
    void worstScenario_compositeIsZero(CandidatePresetType preset) {
        // 최악 시나리오: 기회도·혼잡도·거주인구 0 + 위험도 100 (반전 → 0) → composite = 0
        Map<CommercialHeatmapMetricType, Double> worstCase = new EnumMap<>(CommercialHeatmapMetricType.class);
        worstCase.put(CommercialHeatmapMetricType.OPPORTUNITY_SCORE, 0D);
        worstCase.put(CommercialHeatmapMetricType.RISK_SCORE, 100D);
        worstCase.put(CommercialHeatmapMetricType.CONGESTION_SCORE, 0D);
        worstCase.put(CommercialHeatmapMetricType.RESIDENT_POPULATION_SCORE, 0D);

        double composite = preset.computeComposite(worstCase, null);

        assertThat(composite).isEqualTo(0D);
    }
}

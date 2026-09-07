package com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.bosspickseoul.domainlayer.commercial.application.model.CandidatePresetType;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.model.CommercialHeatmapMetricType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class CommercialCandidateQueryProcessorTest {

    @Test
    void resolvePresetFromServiceCode_mapsKnownPrefixesAndFallsBackToBalanced() {
        assertThat(CommercialCandidateQueryProcessor.resolvePresetFromServiceCode("CS100001"))
            .isEqualTo(CandidatePresetType.AGGRESSIVE_OPPORTUNITY);
        assertThat(CommercialCandidateQueryProcessor.resolvePresetFromServiceCode("CS200001"))
            .isEqualTo(CandidatePresetType.STABLE_LOW_RISK);
        assertThat(CommercialCandidateQueryProcessor.resolvePresetFromServiceCode("CS300001"))
            .isEqualTo(CandidatePresetType.BALANCED);
        assertThat(CommercialCandidateQueryProcessor.resolvePresetFromServiceCode(null))
            .isEqualTo(CandidatePresetType.BALANCED);
    }

    @Test
    @DisplayName("추천 이유는 지표명을 한 번만 쓰고 조사도 앞말에 맞춘다")
    void buildSelectionReason_usesMetricNameOnceAndMatchesJosa() {
        String reason = CommercialCandidateQueryProcessor.buildSelectionReason(
            CandidatePresetType.AGGRESSIVE_OPPORTUNITY.getDisplayName(),
            CommercialHeatmapMetricType.OPPORTUNITY_SCORE.getDisplayName(),
            "기회도 높음",
            "위험도 높음"
        );

        assertThat(reason).isEqualTo("공격형 기준으로 기회도를 우선 반영했고, 기회도 높음 · 위험도 높음입니다.");
    }

    @Test
    @DisplayName("등급 낱말은 셋 다 받침으로 끝나므로 어떤 등급에서도 비문이 되지 않는다")
    void buildSelectionReason_neverProducesBrokenJosaForAnyGrade() {
        for (String gradeWord : new String[] {"높음", "보통", "낮음"}) {
            String reason = CommercialCandidateQueryProcessor.buildSelectionReason(
                "균형형", "기회도", "기회도 " + gradeWord, "위험도 " + gradeWord
            );

            assertThat(reason)
                .doesNotContain("높음를", "보통를", "낮음를")
                .doesNotContain("기회도는 기회도", "위험도는 위험도");
        }
    }

    @Test
    @DisplayName("받침으로 끝나는 지표명이 들어와도 조사가 따라온다")
    void buildSelectionReason_choosesJosaFromTheMetricName() {
        assertThat(CommercialCandidateQueryProcessor.buildSelectionReason(
            "균형형", "거주수요", "기회도 보통", "위험도 낮음"))
            .startsWith("균형형 기준으로 거주수요를 우선 반영했고,");

        // 지표명이 바뀌어 받침으로 끝나게 되더라도 문장이 깨지지 않는다.
        assertThat(CommercialCandidateQueryProcessor.buildSelectionReason(
            "균형형", "생활인구", "기회도 보통", "위험도 낮음"))
            .startsWith("균형형 기준으로 생활인구를 우선 반영했고,");
        assertThat(CommercialCandidateQueryProcessor.buildSelectionReason(
            "균형형", "구매력", "기회도 보통", "위험도 낮음"))
            .startsWith("균형형 기준으로 구매력을 우선 반영했고,");
    }

    @Test
    @DisplayName("점수가 없어 라벨이 '데이터 부족' 으로 와도 문장은 성립한다")
    void buildSelectionReason_readsWellWhenLabelsAreMissing() {
        assertThat(CommercialCandidateQueryProcessor.buildSelectionReason(
            "균형형", "기회도", "데이터 부족", "데이터 부족"))
            .isEqualTo("균형형 기준으로 기회도를 우선 반영했고, 데이터 부족 · 데이터 부족입니다.");
    }
}

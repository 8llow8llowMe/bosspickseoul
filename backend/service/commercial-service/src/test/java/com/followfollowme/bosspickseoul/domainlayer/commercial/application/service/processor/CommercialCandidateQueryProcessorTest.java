package com.followfollowme.bosspickseoul.domainlayer.commercial.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.bosspickseoul.domainlayer.commercial.application.model.CandidatePresetType;
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

    /**
     * 화면 카드에 그대로 보이는 문장이라 비문이 나가면 사용자가 본다.
     * 「기회도 높음<b>를</b>」(조사)과 「기회도는 기회도 높음」(라벨 중복) 두 가지가 틀려 있었다.
     */
    @Test
    void buildSelectionReason_choosesParticleAndDoesNotRepeatMetricName() {
        String reason = CommercialCandidateQueryProcessor.buildSelectionReason(
            "공격형", "기회도", "기회도 높음", "위험도 높음"
        );

        assertThat(reason).isEqualTo("공격형 기준으로 기회도를 우선 반영했고, 기회도 높음 · 위험도 높음입니다.");
        assertThat(reason).doesNotContain("기회도는 기회도");
        assertThat(reason).doesNotContain("위험도는 위험도");
    }

    @Test
    void buildSelectionReason_usesEulWhenPriorityMetricEndsWithConsonant() {
        String reason = CommercialCandidateQueryProcessor.buildSelectionReason(
            "안정형", "거주 수요 총점", "기회도 보통", "위험도 낮음"
        );

        assertThat(reason).startsWith("안정형 기준으로 거주 수요 총점을 우선 반영했고,");
    }

    /** 점수가 없으면 라벨이 「데이터 부족」으로 온다 — 문장이 깨지지 않아야 한다. */
    @Test
    void buildSelectionReason_keepsSentenceWhenLabelsAreMissing() {
        String reason = CommercialCandidateQueryProcessor.buildSelectionReason(
            "균형형", "혼잡도", "데이터 부족", "데이터 부족"
        );

        assertThat(reason).isEqualTo("균형형 기준으로 혼잡도를 우선 반영했고, 데이터 부족 · 데이터 부족입니다.");
    }
}

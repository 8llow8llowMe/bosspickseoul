package com.followfollowme.nowdoboss.domainlayer.commercial.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.nowdoboss.domainlayer.commercial.application.model.CandidatePresetType;
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
}

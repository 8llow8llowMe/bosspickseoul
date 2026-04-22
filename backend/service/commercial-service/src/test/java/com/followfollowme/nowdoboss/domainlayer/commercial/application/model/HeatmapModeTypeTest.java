package com.followfollowme.nowdoboss.domainlayer.commercial.application.model;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.nowdoboss.common.dto.metadata.CodeNameDescriptionMetadata;
import com.followfollowme.nowdoboss.common.enums.HeatmapModeType;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

class HeatmapModeTypeTest {

    @ParameterizedTest
    @EnumSource(HeatmapModeType.class)
    void toMetadata_hasNonNullCodeNameDescription(HeatmapModeType mode) {
        CodeNameDescriptionMetadata metadata = mode.toMetadata();

        assertThat(metadata).isNotNull();
        assertThat(metadata.code()).isNotBlank();
        assertThat(metadata.name()).isNotBlank();
        assertThat(metadata.description()).isNotBlank();
    }

    @Test
    void singleMetric_metadataCodeMatchesEnumName() {
        CodeNameDescriptionMetadata metadata = HeatmapModeType.SINGLE_METRIC.toMetadata();

        assertThat(metadata.code()).isEqualTo("SINGLE_METRIC");
    }

    @Test
    void composite_metadataCodeMatchesEnumName() {
        CodeNameDescriptionMetadata metadata = HeatmapModeType.COMPOSITE.toMetadata();

        assertThat(metadata.code()).isEqualTo("COMPOSITE");
    }

    @Test
    void singleMetricAndComposite_metadataCodes_areDistinct() {
        String singleCode = HeatmapModeType.SINGLE_METRIC.toMetadata().code();
        String compositeCode = HeatmapModeType.COMPOSITE.toMetadata().code();

        assertThat(singleCode).isNotEqualTo(compositeCode);
    }

    @ParameterizedTest
    @EnumSource(HeatmapModeType.class)
    void toMetadata_codeMatchesEnumName(HeatmapModeType mode) {
        CodeNameDescriptionMetadata metadata = mode.toMetadata();

        assertThat(metadata.code()).isEqualTo(mode.name());
    }
}

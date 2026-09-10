package com.followfollowme.bosspickseoul.global.properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import org.junit.jupiter.api.Test;

class DatasetReadPropertiesTest {

    @Test
    void blankValuesFallBackToDefaults() {
        DatasetReadProperties properties = new DatasetReadProperties(false, " ", null, "", null);

        assertThat(properties.readEnabled()).isFalse();
        assertThat(properties.spatialVersion()).isEqualTo("legacy-20233");
        assertThat(properties.schemaVersion()).isEqualTo("seoul-v1");
        assertThat(properties.readFromPeriod()).isEqualTo("20241");
        assertThat(properties.resolverCacheTtl()).isEqualTo(Duration.ofSeconds(60));
    }

    @Test
    void negativeTtlFallsBackToDefault() {
        assertThat(new DatasetReadProperties(true, "v", "s", "20242", Duration.ofSeconds(-1)).resolverCacheTtl())
            .isEqualTo(Duration.ofSeconds(60));
    }

    @Test
    void readFromPeriodMustBeAQuarterCode() {
        assertThatThrownBy(() -> new DatasetReadProperties(true, "v", "s", "2024", Duration.ofSeconds(60)))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new DatasetReadProperties(true, "v", "s", "20245", Duration.ofSeconds(60)))
            .isInstanceOf(IllegalArgumentException.class);
    }
}

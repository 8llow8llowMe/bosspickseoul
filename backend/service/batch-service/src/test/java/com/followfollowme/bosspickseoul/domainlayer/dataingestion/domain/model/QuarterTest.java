package com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import org.junit.jupiter.api.Test;

class QuarterTest {

    @Test
    void nextAndPreviousCrossYearBoundaries() {
        assertThat(new Quarter("20261").next()).isEqualTo(new Quarter("20262"));
        assertThat(new Quarter("20254").next()).isEqualTo(new Quarter("20261"));
        assertThat(new Quarter("20261").previous()).isEqualTo(new Quarter("20254"));
        assertThat(new Quarter("20263").previous()).isEqualTo(new Quarter("20262"));
    }

    @Test
    void nextPastTheSupportedRangeIsRejected() {
        assertThatThrownBy(() -> new Quarter("20994").next()).isInstanceOf(IllegalArgumentException.class);
    }

    /** ps1 Get-SourceUpdatedAt 와 같은 값이어야 수동·자동 run 이 같은 source_updated_at 을 쓴다. */
    @Test
    void endInstantIsTheLastDayOfTheQuarterAtMidnightUtc() {
        assertThat(new Quarter("20241").endInstant()).isEqualTo(Instant.parse("2024-03-31T00:00:00Z"));
        assertThat(new Quarter("20242").endInstant()).isEqualTo(Instant.parse("2024-06-30T00:00:00Z"));
        assertThat(new Quarter("20243").endInstant()).isEqualTo(Instant.parse("2024-09-30T00:00:00Z"));
        assertThat(new Quarter("20244").endInstant()).isEqualTo(Instant.parse("2024-12-31T00:00:00Z"));
    }
}

package com.followfollowme.bosspickseoul.domainlayer.policy.domain.model;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class PolicyTest {

    private static final LocalDate BASE = LocalDate.of(2026, 6, 15);

    private Policy policy(LocalDate start, LocalDate end) {
        return Policy.builder().id(1L).applyStartAt(start).applyEndAt(end).build();
    }

    @Test
    void 마감일이_없으면_상시_모집이라_항상_신청_가능하다() {
        assertThat(policy(null, null).isOpenOn(BASE)).isTrue();
    }

    @Test
    void 마감일_당일까지는_신청_가능하다() {
        assertThat(policy(null, BASE).isOpenOn(BASE)).isTrue();
    }

    @Test
    void 마감일이_지나면_신청할_수_없다() {
        assertThat(policy(null, BASE.minusDays(1)).isOpenOn(BASE)).isFalse();
    }

    @Test
    void 시작일_전이면_아직_신청할_수_없다() {
        assertThat(policy(BASE.plusDays(1), null).isOpenOn(BASE)).isFalse();
    }

    @Test
    void 시작일_당일부터_신청_가능하다() {
        assertThat(policy(BASE, null).isOpenOn(BASE)).isTrue();
    }

    @Test
    void 자치구가_지정되면_지역_한정_정책이다() {
        assertThat(Policy.builder().id(1L).districtCode("11680").build().isDistrictSpecific()).isTrue();
        assertThat(Policy.builder().id(1L).build().isDistrictSpecific()).isFalse();
    }
}

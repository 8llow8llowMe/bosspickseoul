package com.followfollowme.bosspickseoul.domainlayer.community.domain.enums;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 인기순 기간의 작성 시각 하한 계산을 검증한다. 롤링 기간이라 달력 주·월이 아니라 기준 시각에서 일수를 뺀다.
 */
class CommunityPopularPeriodTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 10, 2, 13, 45, 30);

    @Test
    @DisplayName("WEEK 는 기준 시각에서 7일 전을 하한으로 쓴다")
    void week_isSevenDaysBeforeNow() {
        assertThat(CommunityPopularPeriod.WEEK.since(NOW)).isEqualTo(LocalDateTime.of(2026, 9, 25, 13, 45, 30));
    }

    @Test
    @DisplayName("MONTH 는 달력 월이 아니라 기준 시각에서 30일 전을 하한으로 쓴다")
    void month_isThirtyDaysBeforeNow() {
        assertThat(CommunityPopularPeriod.MONTH.since(NOW)).isEqualTo(LocalDateTime.of(2026, 9, 2, 13, 45, 30));
    }

    @Test
    @DisplayName("ALL 은 하한이 없어 null 이다")
    void all_hasNoLowerBound() {
        assertThat(CommunityPopularPeriod.ALL.since(NOW)).isNull();
    }

    @Test
    @DisplayName("표시명과 metadata 를 내린다")
    void displayNameAndMetadata() {
        assertThat(CommunityPopularPeriod.WEEK.getDisplayName()).isEqualTo("최근 7일");
        assertThat(CommunityPopularPeriod.MONTH.getDisplayName()).isEqualTo("최근 30일");
        assertThat(CommunityPopularPeriod.ALL.getDisplayName()).isEqualTo("전체 기간");
        assertThat(CommunityPopularPeriod.MONTH.toMetadata().code()).isEqualTo("MONTH");
        assertThat(CommunityPopularPeriod.MONTH.toMetadata().name()).isEqualTo("최근 30일");
    }
}

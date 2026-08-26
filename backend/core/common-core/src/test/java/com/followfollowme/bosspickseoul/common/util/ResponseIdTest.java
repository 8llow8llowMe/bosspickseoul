package com.followfollowme.bosspickseoul.common.util;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class ResponseIdTest {

    /** JavaScript Number.MAX_SAFE_INTEGER. 이 값을 넘으면 JSON 파싱에서 뒷자리가 날아간다. */
    private static final long JS_MAX_SAFE_INTEGER = 9007199254740991L;

    @Test
    @DisplayName("null 은 null 로 남는다 - 없는 식별자를 \"0\" 이나 \"null\" 문자열로 만들지 않는다")
    void nullStaysNull() {
        assertThat(ResponseId.of(null)).isNull();
    }

    @Test
    @DisplayName("Snowflake 자릿수의 값도 자릿수를 잃지 않는다")
    void keepsFullPrecisionOfSnowflakeSizedValue() {
        long id = 9000000000000000001L;

        assertThat(id).isGreaterThan(JS_MAX_SAFE_INTEGER);
        assertThat(ResponseId.of(id)).isEqualTo("9000000000000000001");
    }

    @Test
    @DisplayName("한계를 넘는 인접한 두 값이 서로 다른 문자열로 구분된다")
    void adjacentLargeValuesRemainDistinguishable() {
        String first = ResponseId.of(9000000000000000001L);
        String second = ResponseId.of(9000000000000000002L);

        assertThat(first).isNotEqualTo(second);
    }

    @Test
    @DisplayName("한계 안의 작은 값도 같은 규칙으로 문자열이 된다")
    void smallValueFollowsTheSameRule() {
        assertThat(ResponseId.of(1L)).isEqualTo("1");
    }
}

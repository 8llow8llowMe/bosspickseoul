package com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.query;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 커서 조회 결과 계약. 포트가 돌려준 목록이 호출한 쪽에서 바뀌면
 * 어댑터가 준 조회 결과와 화면에 나가는 목록이 달라질 수 있어 방어적으로 복사한다.
 */
class SliceQueryResultTest {

    @Test
    @DisplayName("원본 리스트를 나중에 바꿔도 조회 결과는 그대로다")
    void copiesSourceList() {
        List<String> source = new ArrayList<>(List.of("a", "b"));
        SliceQueryResult<String> result = SliceQueryResult.of(source, true);

        source.add("c");

        assertThat(result.content()).containsExactly("a", "b");
        assertThat(result.hasNext()).isTrue();
    }

    @Test
    @DisplayName("조회 결과 목록은 수정할 수 없다")
    void contentIsImmutable() {
        SliceQueryResult<String> result = SliceQueryResult.of(List.of("a"), false);

        assertThatThrownBy(() -> result.content().add("b"))
            .isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    @DisplayName("내용이 null 이면 빈 목록으로 다룬다")
    void nullContentBecomesEmptyList() {
        SliceQueryResult<String> result = SliceQueryResult.of(null, false);

        assertThat(result.content()).isEmpty();
        assertThat(result.hasNext()).isFalse();
    }
}

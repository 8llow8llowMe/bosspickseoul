package com.followfollowme.bosspickseoul.domainlayer.district.application.common;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 자치구 전체 순위(이슈 #433)의 표준 경쟁 순위를 못 박는다. 같은 값은 같은 순위이고, 다음 순위는 동점자 수만큼 건너뛴다.
 */
class CompetitionRankCalculatorTest {

    private record Row(String code, long value) {
    }

    private record Ranked(int rank, String code) {
    }

    @Test
    @DisplayName("동점은 같은 순위이고 다음 순위는 건너뛴다 (1, 2, 2, 4)")
    void tiesShareRankAndSkipNext() {
        List<Ranked> ranked = rank(List.of(new Row("A", 40), new Row("B", 30), new Row("C", 30), new Row("D", 10)));

        assertThat(ranked).containsExactly(new Ranked(1, "A"), new Ranked(2, "B"), new Ranked(2, "C"), new Ranked(4, "D"));
    }

    @Test
    @DisplayName("맨 앞 동점과 연속 동점도 같은 규칙이다 (1, 1, 3, 3, 3, 6)")
    void leadingAndConsecutiveTies() {
        List<Ranked> ranked = rank(List.of(
            new Row("A", 9), new Row("B", 9), new Row("C", 5), new Row("D", 5), new Row("E", 5), new Row("F", 0)));

        assertThat(ranked).extracting(Ranked::rank).containsExactly(1, 1, 3, 3, 3, 6);
    }

    @Test
    @DisplayName("모든 값이 다르면 1 부터 차례대로다")
    void distinctValuesAreSequential() {
        List<Ranked> ranked = rank(List.of(new Row("A", 3), new Row("B", 2), new Row("C", 1)));

        assertThat(ranked).extracting(Ranked::rank).containsExactly(1, 2, 3);
    }

    @Test
    @DisplayName("빈 목록은 빈 목록이다")
    void emptyListIsEmpty() {
        assertThat(rank(List.of())).isEmpty();
    }

    @Test
    @DisplayName("입력 순서를 바꾸지 않는다 — 동점 내 순서(자치구 코드 오름차순)는 저장소가 정한 그대로다")
    void keepsInputOrder() {
        List<Ranked> ranked = rank(List.of(new Row("11140", 7), new Row("11215", 7)));

        assertThat(ranked).extracting(Ranked::code).containsExactly("11140", "11215");
    }

    @Test
    @DisplayName("값 내림차순이 아닌 입력은 틀린 순위를 내리지 않고 IllegalStateException 이다")
    void rejectsUnsortedInput() {
        List<Row> unsorted = List.of(new Row("A", 10), new Row("B", 30), new Row("C", 20));

        assertThatThrownBy(() -> rank(unsorted))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("index=1");
    }

    private static List<Ranked> rank(List<Row> rows) {
        return CompetitionRankCalculator.rank(rows, Row::value, (rank, row) -> new Ranked(rank, row.code()));
    }
}

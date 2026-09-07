package com.followfollowme.bosspickseoul.common.util;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class KoreanJosaTest {

    @ParameterizedTest
    @CsvSource({
        // 받침 있음 → 을
        "기회도 높음, 기회도 높음을",
        "데이터 부족, 데이터 부족을",
        "위험, 위험을",
        // 받침 없음 → 를
        "기회도, 기회도를",
        "위험도, 위험도를",
        "혼잡도, 혼잡도를",
        "거주수요, 거주수요를"
    })
    @DisplayName("목적격 조사는 앞말의 받침에 따라 을/를 을 고른다")
    void appendObjectiveChoosesByFinalConsonant(String word, String expected) {
        assertThat(KoreanJosa.appendObjective(word)).isEqualTo(expected);
    }

    @ParameterizedTest
    @CsvSource({
        "기회도 높음, 기회도 높음이, 기회도 높음은",
        "기회도, 기회도가, 기회도는"
    })
    @DisplayName("주격·보조사도 같은 규칙을 따른다")
    void appendSubjectiveAndTopicFollowTheSameRule(String word, String subjective, String topic) {
        assertThat(KoreanJosa.appendSubjective(word)).isEqualTo(subjective);
        assertThat(KoreanJosa.appendTopic(word)).isEqualTo(topic);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   "})
    @DisplayName("붙일 말이 없으면 조사도 붙이지 않는다")
    void blankWordGetsNoJosa(String word) {
        assertThat(KoreanJosa.appendObjective(word)).isEmpty();
        assertThat(KoreanJosa.hasFinalConsonant(word)).isFalse();
    }

    @Test
    @DisplayName("한글 음절이 아니면 받침이 없는 것으로 본다")
    void nonHangulHasNoFinalConsonant() {
        assertThat(KoreanJosa.hasFinalConsonant("TOP")).isFalse();
        assertThat(KoreanJosa.hasFinalConsonant("5")).isFalse();
        assertThat(KoreanJosa.hasFinalConsonant("상권 A")).isFalse();
    }

    @Test
    @DisplayName("한글 음절 구간의 경계에서도 종성 판정이 어긋나지 않는다")
    void detectsFinalConsonantAtSyllableBlockBoundaries() {
        // '가' 는 구간의 첫 음절이자 종성이 없는 음절, '각' 은 그 다음 음절이라 종성이 있다.
        assertThat(KoreanJosa.hasFinalConsonant("가")).isFalse();
        assertThat(KoreanJosa.hasFinalConsonant("각")).isTrue();
        // '히' 는 종성이 없고, '힣' 은 구간의 마지막 음절이라 종성이 있다.
        assertThat(KoreanJosa.hasFinalConsonant("히")).isFalse();
        assertThat(KoreanJosa.hasFinalConsonant("힣")).isTrue();
    }
}

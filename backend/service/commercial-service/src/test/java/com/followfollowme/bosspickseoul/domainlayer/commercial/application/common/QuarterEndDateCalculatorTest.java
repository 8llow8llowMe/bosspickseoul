package com.followfollowme.bosspickseoul.domainlayer.commercial.application.common;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class QuarterEndDateCalculatorTest {

    @ParameterizedTest(name = "{0} -> {1}")
    @CsvSource({
        "20211, 2021-03-31",
        "20212, 2021-06-30",
        "20243, 2024-09-30",
        "20244, 2024-12-31",
        "20261, 2026-03-31"
    })
    @DisplayName("분기 코드는 그 분기의 말일로 바뀐다")
    void quarterEndDate_wellFormedPeriodCode(String periodCode, LocalDate expected) {
        assertThat(QuarterEndDateCalculator.quarterEndDate(periodCode)).contains(expected);
    }

    @ParameterizedTest(name = "[{0}]")
    @NullAndEmptySource
    @ValueSource(strings = {"2024", "20240", "20245", "202411", "2024Q", "abcde", " 20241"})
    @DisplayName("분기 형식이 아니면 예외 대신 값 없음이다")
    void quarterEndDate_malformedPeriodCode_isEmpty(String periodCode) {
        assertThat(QuarterEndDateCalculator.quarterEndDate(periodCode)).isEmpty();
    }
}

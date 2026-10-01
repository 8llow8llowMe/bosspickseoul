package com.followfollowme.bosspickseoul.domainlayer.commercial.application.common;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 분기 코드({@code 20261})를 그 분기의 말일로 바꾼다. (이슈 #415)
 *
 * <p>분기가 아닌 시점 단위(연 1회 스냅샷 등)로 적재된 원천을 「요청 분기에 이미 나와 있던 자료」로 고를 때 쓴다. 형식이 틀리면
 * 예외 대신 빈 값을 돌려준다 — 이 변환을 쓰는 지표는 부가 정보라 분기 하나가 이상하다고 응답 전체를 400 으로 깨지 않는다.
 *
 * <p>common-core 로 올리지 않는다. 분기 코드 형식은 상권 도메인 계약이고, 지금 쓰는 곳은 이 서비스의 소득 대체 하나다.
 */
public final class QuarterEndDateCalculator {

    private static final Pattern PERIOD_CODE = Pattern.compile("^(\\d{4})([1-4])$");
    private static final int MONTHS_PER_QUARTER = 3;

    private QuarterEndDateCalculator() {
    }

    /** {@code 20211} -> {@code 2021-03-31}, {@code 20244} -> {@code 2024-12-31}. 형식이 아니면 비어 있다. */
    public static Optional<LocalDate> quarterEndDate(String periodCode) {
        if (periodCode == null) {
            return Optional.empty();
        }
        Matcher matcher = PERIOD_CODE.matcher(periodCode);
        if (!matcher.matches()) {
            return Optional.empty();
        }
        int year = Integer.parseInt(matcher.group(1));
        int quarter = Integer.parseInt(matcher.group(2));
        return Optional.of(YearMonth.of(year, quarter * MONTHS_PER_QUARTER).atEndOfMonth());
    }
}

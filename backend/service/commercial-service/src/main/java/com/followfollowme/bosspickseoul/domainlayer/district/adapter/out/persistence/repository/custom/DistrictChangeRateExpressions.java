package com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository.custom;

import com.querydsl.core.types.dsl.CaseBuilder;
import com.querydsl.core.types.dsl.NumberExpression;

/**
 * 자치구 지표의 전분기 대비 증감률 식 {@code (현재 - 이전) / 이전 * 100}. Top10 과 전체 순위(이슈 #433)가 같은 식을 쓰고,
 * 이전 값이 없거나 0 일 때의 처리만 다르다.
 *
 * <p>두 경우 모두 0 으로 나누는 식이 DB 에 그대로 가지 않게 막는다. 가드가 없으면 DB 마다 결과가 갈린다 — MySQL 은 NULL 을
 * 돌려주지만 H2 는 Division by zero 로 예외를 던져 슬라이스 테스트가 깨진다. 행정동 쪽(SalesAdministrationRepositoryAdapter)이
 * 쓰는 것과 같은 형태다.
 */
final class DistrictChangeRateExpressions {

    private static final double PERCENT_MULTIPLIER = 100.0;

    private DistrictChangeRateExpressions() {
    }

    /**
     * Top10 용. 이전 값이 없거나(NULL) 0 이면 변화율을 0 으로 본다. Top10 응답 계약({@code double}, 결측 0.0)이 이 동작에 기대고 있다.
     */
    static NumberExpression<Double> zeroWhenMissing(NumberExpression<Double> currentValue, NumberExpression<Double> previousValue) {
        NumberExpression<Double> safePreviousValue = previousValue.coalesce(0.0);
        return new CaseBuilder()
            .when(safePreviousValue.eq(0.0)).then(0.0)
            .otherwise(percentChange(currentValue, safePreviousValue, safePreviousValue));
    }

    /**
     * 전체 순위용. 이전 값이 없거나(NULL) 0 이면 변화율도 NULL 이다. 결측을 0 으로 지어내지 않아 프론트가 "비교 불가"로 표기할 수 있다.
     * {@code NULLIF(이전, 0)} 으로 나누므로 0 나눗셈이 일어나지 않고, 이전 값이 NULL 이면 식 전체가 NULL 이 된다.
     */
    static NumberExpression<Double> nullWhenMissing(NumberExpression<Double> currentValue, NumberExpression<Double> previousValue) {
        return percentChange(currentValue, previousValue, previousValue.nullif(0.0));
    }

    private static NumberExpression<Double> percentChange(
        NumberExpression<Double> currentValue, NumberExpression<Double> previousValue, NumberExpression<Double> divisor
    ) {
        return currentValue
            .subtract(previousValue)
            .divide(divisor)
            .multiply(PERCENT_MULTIPLIER);
    }
}

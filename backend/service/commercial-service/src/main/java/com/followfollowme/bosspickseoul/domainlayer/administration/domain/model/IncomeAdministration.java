package com.followfollowme.bosspickseoul.domainlayer.administration.domain.model;

import java.util.stream.LongStream;
import java.util.stream.Stream;
import lombok.Builder;

/**
 * 행정동 소득소비. 세부 10항목은 2024년 1분기 이후 상권 소비를 대체하는 원천이라 이슈 #415 에서 넓혔다.
 *
 * <p>세부 항목이 {@code Long} 인 것은 의도다. {@code 20211}~{@code 20233} 레거시 행은 총액만 적재돼 있어
 * 컬럼이 NULL 이고, 그 구간은 상권 네이티브 소비가 살아 있어 대체가 필요 없다. 0 으로 채워 내려보내면
 * "실제로 0원"과 "적재 안 됨"이 구별되지 않는다.
 */
@Builder
public record IncomeAdministration(
    long id,
    String periodCode,
    String administrationCode,
    String administrationName,
    long totalExpenseAmount,
    Long groceryExpenseAmount,
    Long clothingExpenseAmount,
    Long householdExpenseAmount,
    Long medicalExpenseAmount,
    Long transportationExpenseAmount,
    Long educationExpenseAmount,
    Long entertainmentExpenseAmount,
    Long leisureCultureExpenseAmount,
    Long otherExpenseAmount,
    Long diningExpenseAmount
) {

    /**
     * 세부 10항목의 합. 상권과 같은 기준(항목합)으로 판정하려고 합계 컬럼 {@code totalExpenseAmount} 과
     * 이름을 나눈다. 실측에서 두 값의 차이는 게시된 10개 분기 425행 전부 0 이었다.
     */
    public long expenseDetailSum() {
        return LongStream.of(
            nullSafe(groceryExpenseAmount), nullSafe(clothingExpenseAmount), nullSafe(householdExpenseAmount),
            nullSafe(medicalExpenseAmount), nullSafe(transportationExpenseAmount), nullSafe(educationExpenseAmount),
            nullSafe(entertainmentExpenseAmount), nullSafe(leisureCultureExpenseAmount),
            nullSafe(otherExpenseAmount), nullSafe(diningExpenseAmount)
        ).sum();
    }

    /**
     * 이 행을 상권 소비의 대체 출처로 쓸 수 없는지. (이슈 #415)
     *
     * <p>판정 기준은 상권과 같다 — <b>세부 항목의 합</b>이지 합계 컬럼이 아니다. 화면과 프롬프트가 쓰는 것이
     * 항목별 금액이라, 항목이 전부 0 인데 합계만 양수인 행을 값 있는 행으로 보면 "총액은 있는데 항목은 전부 0원"
     * 이라는 모순이 그대로 나간다.
     *
     * <p>세부 항목이 하나라도 NULL 인 레거시 행은 대체 대상이 아니다. 그 구간({@code 20233} 이하)은 상권
     * 네이티브 소비가 살아 있어 사다리가 1단계에서 끝난다.
     */
    public boolean expenseDetailUnavailable() {
        boolean anyMissing = Stream.of(
            groceryExpenseAmount, clothingExpenseAmount, householdExpenseAmount, medicalExpenseAmount,
            transportationExpenseAmount, educationExpenseAmount, entertainmentExpenseAmount,
            leisureCultureExpenseAmount, otherExpenseAmount, diningExpenseAmount
        ).anyMatch(amount -> amount == null);

        return anyMissing || expenseDetailSum() == 0L;
    }

    private static long nullSafe(Long amount) {
        return amount == null ? 0L : amount;
    }
}

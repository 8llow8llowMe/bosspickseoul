package com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model;

import lombok.Builder;

@Builder
public record IncomeCommercial(
    long id,
    String periodCode,
    String commercialClassificationCode,
    String commercialClassificationName,
    String commercialCode,
    String commercialName,
    long totalExpenseAmount,
    long groceryExpenseAmount,
    long clothingExpenseAmount,
    long medicalExpenseAmount,
    long householdExpenseAmount,
    long transportationExpenseAmount,
    long leisureExpenseAmount,
    long cultureExpenseAmount,
    long educationExpenseAmount,
    long entertainmentExpenseAmount
) {

    /**
     * 9개 지출 항목의 합.
     *
     * <p>영속 컬럼 {@code totalExpenseAmount} 와 이름을 나눠 어느 쪽이 원천 컬럼이고 어느 쪽이 계산값인지
     * 코드에서 드러나게 한다. 두 값은 2026-09-15 전수 실측(41,883행)에서 전 행 일치했다.
     */
    public long expenseCategorySum() {
        return groceryExpenseAmount + clothingExpenseAmount + medicalExpenseAmount
            + householdExpenseAmount + transportationExpenseAmount + leisureExpenseAmount
            + cultureExpenseAmount + educationExpenseAmount + entertainmentExpenseAmount;
    }

    /**
     * 원천이 이 상권·분기의 지출을 제공하지 않았는지. 서울 열린데이터광장이 20241 분기부터 상권 단위
     * 지출을 전 행 0 으로 내려보내므로, 합이 0 이면 "실제로 0원"이 아니라 "값 없음"이다. (이슈 #413)
     *
     * <p><b>판정 정본은 9개 항목의 합</b>이고 영속 컬럼 {@code totalExpenseAmount} 이 아니다. 화면과 LLM
     * 프롬프트가 쓰는 것이 항목별 금액이라, 항목이 전부 0 인데 합계 컬럼만 양수인 행이 들어오면
     * "총액은 있는데 항목은 전부 0원" 이라는 모순이 그대로 나간다. 항목을 기준으로 삼으면 그 모순이
     * 애초에 생기지 않는다. 전수 실측에서 두 값은 일치했고 음수 항목도 0건이라 상쇄로 합만 0 이 되는
     * 경우는 없다.
     *
     * <p>{@code /commercials/{code}/income} 과 {@code /commercials/summaries/income} 두 경로가 모두 이
     * 메서드를 쓴다. 판정이 한쪽에만 있으면 같은 상권·분기가 한쪽에서는 "미제공", 다른 쪽에서는
     * "0원"으로 보인다.
     */
    public boolean expenseUnavailable() {
        return expenseCategorySum() == 0L;
    }
}

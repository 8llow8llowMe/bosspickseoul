package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.income;

import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.IncomeCommercial;
import lombok.Builder;

@Builder
public record CommercialIncomeAndExpenseInfo(
    CommercialExpenseByCategoryInfo expenseByCategoryInfo
) {

    public static CommercialIncomeAndExpenseInfo from(IncomeCommercial incomeCommercial) {
        return CommercialIncomeAndExpenseInfo.builder()
            .expenseByCategoryInfo(expenseByCategoryOrNull(incomeCommercial))
            .build();
    }

    /**
     * 서울 열린데이터광장이 20241 분기부터 상권 단위 지출을 전 행 0 으로 내려보낸다.
     * 9개 항목 합계가 0 이면 "실제로 0원"이 아니라 "값 없음"이므로 null 로 강등해
     * 화면에 0원이 실측치처럼 표시되지 않게 한다. (이슈 #413)
     */
    private static CommercialExpenseByCategoryInfo expenseByCategoryOrNull(IncomeCommercial incomeCommercial) {
        CommercialExpenseByCategoryInfo expenseByCategory = CommercialExpenseByCategoryInfo.from(incomeCommercial);
        return expenseByCategory.totalExpenseAmount() == 0L ? null : expenseByCategory;
    }
}

package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.income;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.IncomeCommercial;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class CommercialIncomeAndExpenseInfoTest {

    @Test
    @DisplayName("지출 9항목이 모두 0이면 '0원'이 아니라 '값 없음'으로 본다")
    void from_allExpenseAmountsZero_degradesExpenseToNull() {
        // 이슈 #413: 서울 열린데이터광장이 20241 분기부터 상권 단위 지출을 전 행 0 으로 내려보낸다.
        CommercialIncomeAndExpenseInfo info = CommercialIncomeAndExpenseInfo.from(IncomeCommercial.builder().build());

        assertThat(info.expenseByCategoryInfo()).isNull();
    }

    @Test
    @DisplayName("지출 항목이 하나라도 0이 아니면 실측치로 보고 그대로 채운다")
    void from_anyExpenseAmountPresent_keepsExpense() {
        CommercialIncomeAndExpenseInfo info = CommercialIncomeAndExpenseInfo.from(IncomeCommercial.builder()
            .groceryExpenseAmount(320_000)
            .cultureExpenseAmount(90_000)
            .build());

        assertThat(info.expenseByCategoryInfo()).isNotNull();
        assertThat(info.expenseByCategoryInfo().totalExpenseAmount()).isEqualTo(410_000L);
    }
}

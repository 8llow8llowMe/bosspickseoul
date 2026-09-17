package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.income;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.enums.ExpenseScopeType;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.IncomeCommercial;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class CommercialIncomeAndExpenseInfoTest {

    @Test
    @DisplayName("지출 9항목이 모두 0이면 '0원'이 아니라 '값 없음'으로 본다")
    void from_allExpenseAmountsZero_degradesExpenseToNull() {
        // 이슈 #413: 서울 열린데이터광장이 20241 분기부터 상권 단위 지출을 전 행 0 으로 내려보낸다.
        CommercialIncomeAndExpenseInfo info = CommercialIncomeAndExpenseInfo.from(IncomeCommercial.builder().build());

        assertThat(info.expenseCategories()).isNull();
        assertThat(info.expenseCategorySum()).isNull();
        // 이슈 #415: 값이 없어도 어느 원천이 왜 끊겼는지는 전한다.
        assertThat(info.provenance().scope()).isEqualTo(ExpenseScopeType.UNAVAILABLE);
    }

    @Test
    @DisplayName("지출 항목이 하나라도 0이 아니면 실측치로 보고 상권 스코프로 채운다")
    void from_anyExpenseAmountPresent_keepsExpense() {
        CommercialIncomeAndExpenseInfo info = CommercialIncomeAndExpenseInfo.from(IncomeCommercial.builder()
            .periodCode("20233")
            .commercialCode("3110008")
            .commercialName("배화여자대학교")
            .groceryExpenseAmount(320_000)
            .cultureExpenseAmount(90_000)
            .build());

        assertThat(info.expenseCategories()).hasSize(9);
        assertThat(info.expenseCategorySum()).isEqualTo(410_000L);
        assertThat(info.provenance().scope()).isEqualTo(ExpenseScopeType.COMMERCIAL);
        assertThat(info.provenance().scopeCode()).isEqualTo("3110008");
        assertThat(info.provenance().effectivePeriodCode()).isEqualTo("20233");
        assertThat(info.provenance().disclaimer()).isNull();
    }

    @Test
    @DisplayName("합계 컬럼과 9항목 합이 갈리면 9항목 합이 정본이다")
    void from_persistedTotalDisagreesWithCategories_followsTheCategorySum() {
        // 이슈 #413: 화면·프롬프트가 쓰는 것이 항목별 금액이므로 "총액만 양수" 인 행을 값 있는 행으로 보지 않는다.
        CommercialIncomeAndExpenseInfo info = CommercialIncomeAndExpenseInfo.from(IncomeCommercial.builder()
            .totalExpenseAmount(999_999)
            .build());

        assertThat(info.expenseCategories()).isNull();
        assertThat(info.expenseCategorySum()).isNull();
    }

    @Test
    @DisplayName("네이티브 경로는 대체를 시도하지 않는다 - 히트맵·비교가 쓰는 경로이기 때문이다")
    void from_neverProducesAdministrationProxyScope() {
        // 이슈 #415: 대체값은 같은 행정동 상권이 전부 같은 값이라 점수·승패 판정에 들어가면 안 된다.
        CommercialIncomeAndExpenseInfo info = CommercialIncomeAndExpenseInfo.from(IncomeCommercial.builder().build());

        assertThat(info.provenance().scope()).isNotEqualTo(ExpenseScopeType.ADMINISTRATION_PROXY);
    }
}

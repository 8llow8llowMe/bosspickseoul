package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.income;

import com.followfollowme.bosspickseoul.domainlayer.administration.domain.model.IncomeAdministration;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.enums.ExpenseCategoryType;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.ExpenseCategoryAmount;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.IncomeCommercial;
import java.util.List;
import lombok.Builder;

/**
 * 상권 화면·프롬프트가 쓰는 소비 지표 한 벌. 값과 출처를 함께 든다. (이슈 #413, #415)
 *
 * <p>항목이 고정 필드가 아니라 <b>배열</b>인 이유는 스코프마다 구성이 다르기 때문이다. 상권 네이티브는 9항목,
 * 행정동 대체는 10항목이고 여가·문화가 합쳐져 있다.
 */
@Builder
public record CommercialIncomeAndExpenseInfo(
    Long expenseCategorySum,
    List<ExpenseCategoryAmount> expenseCategories,
    CommercialExpenseProvenanceInfo provenance
) {

    /**
     * 상권 네이티브 한 행만 보고 만든다. 지출이 미제공이면 대체를 시도하지 않고 바로 「없음」이다 —
     * 대체 판단은 {@code CommercialExpenseProvenanceProcessor} 의 사다리가 하고, 이 경로는 히트맵·비교처럼
     * 대체를 <b>쓰지 않아야 하는</b> 호출부가 쓴다. (이슈 #415 「점수 계산에 proxy 를 넣지 않는다」)
     *
     * <p>미제공 판정은 도메인 {@link IncomeCommercial#expenseUnavailable()} 한 곳에만 있고 요약 경로도 같은
     * 메서드를 쓴다. (이슈 #413)
     */
    public static CommercialIncomeAndExpenseInfo from(IncomeCommercial incomeCommercial) {
        if (incomeCommercial.expenseUnavailable()) {
            return unavailable();
        }
        return CommercialIncomeAndExpenseInfo.builder()
            .expenseCategorySum(incomeCommercial.expenseCategorySum())
            .expenseCategories(incomeCommercial.expenseCategories())
            .provenance(CommercialExpenseProvenanceInfo.ofCommercial(
                incomeCommercial.periodCode(), incomeCommercial.commercialCode(), incomeCommercial.commercialName()))
            .build();
    }

    /**
     * 행정동 소비로 대체한다. 항목 구성이 상권과 달라 여기서 순서를 따로 정한다 —
     * 여가·문화가 합산본 하나이고 기타·음식이 더 있다.
     */
    public static CommercialIncomeAndExpenseInfo ofAdministrationProxy(IncomeAdministration incomeAdministration) {
        List<ExpenseCategoryAmount> categories = List.of(
            ExpenseCategoryAmount.of(ExpenseCategoryType.GROCERY, incomeAdministration.groceryExpenseAmount()),
            ExpenseCategoryAmount.of(ExpenseCategoryType.CLOTHING_FOOTWEAR, incomeAdministration.clothingExpenseAmount()),
            ExpenseCategoryAmount.of(ExpenseCategoryType.MEDICAL, incomeAdministration.medicalExpenseAmount()),
            ExpenseCategoryAmount.of(ExpenseCategoryType.HOUSEHOLD, incomeAdministration.householdExpenseAmount()),
            ExpenseCategoryAmount.of(ExpenseCategoryType.TRANSPORTATION, incomeAdministration.transportationExpenseAmount()),
            ExpenseCategoryAmount.of(ExpenseCategoryType.EDUCATION, incomeAdministration.educationExpenseAmount()),
            ExpenseCategoryAmount.of(ExpenseCategoryType.ENTERTAINMENT, incomeAdministration.entertainmentExpenseAmount()),
            ExpenseCategoryAmount.of(ExpenseCategoryType.LEISURE_CULTURE, incomeAdministration.leisureCultureExpenseAmount()),
            ExpenseCategoryAmount.of(ExpenseCategoryType.OTHER, incomeAdministration.otherExpenseAmount()),
            ExpenseCategoryAmount.of(ExpenseCategoryType.DINING, incomeAdministration.diningExpenseAmount())
        );

        return CommercialIncomeAndExpenseInfo.builder()
            .expenseCategorySum(incomeAdministration.expenseDetailSum())
            .expenseCategories(categories)
            .provenance(CommercialExpenseProvenanceInfo.ofAdministrationProxy(
                incomeAdministration.periodCode(),
                incomeAdministration.administrationCode(),
                incomeAdministration.administrationName()))
            .build();
    }

    /** 사다리 3단계. 값은 비우고 중단 사실만 남긴다. */
    public static CommercialIncomeAndExpenseInfo unavailable() {
        return CommercialIncomeAndExpenseInfo.builder()
            .provenance(CommercialExpenseProvenanceInfo.unavailable())
            .build();
    }

    public boolean hasValue() {
        return expenseCategorySum != null;
    }
}

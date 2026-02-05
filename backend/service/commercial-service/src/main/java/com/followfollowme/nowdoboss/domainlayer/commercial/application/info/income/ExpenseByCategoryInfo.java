package com.followfollowme.nowdoboss.domainlayer.commercial.application.info.income;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.IncomeCommercial;
import lombok.Builder;

@Builder
public record ExpenseByCategoryInfo(
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

    public static ExpenseByCategoryInfo from(IncomeCommercial incomeCommercial) {
        return ExpenseByCategoryInfo.builder()
            .groceryExpenseAmount(incomeCommercial.groceryExpenseAmount())
            .clothingExpenseAmount(incomeCommercial.clothingExpenseAmount())
            .medicalExpenseAmount(incomeCommercial.medicalExpenseAmount())
            .householdExpenseAmount(incomeCommercial.householdExpenseAmount())
            .transportationExpenseAmount(incomeCommercial.transportationExpenseAmount())
            .leisureExpenseAmount(incomeCommercial.leisureExpenseAmount())
            .cultureExpenseAmount(incomeCommercial.cultureExpenseAmount())
            .educationExpenseAmount(incomeCommercial.educationExpenseAmount())
            .entertainmentExpenseAmount(incomeCommercial.entertainmentExpenseAmount())
            .build();
    }
}

package com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query;

public record CommercialIncomeAndExpenseQueryResult(
    CommercialAverageIncomeQueryResult averageIncomeItem,
    CommercialExpenseByCategoryQueryResult expenseByCategoryItem
) {

}

record CommercialAverageIncomeQueryResult(long monthlyAverageIncomeAmount, int incomeBracketCode) {}

record CommercialExpenseByCategoryQueryResult(
    long groceryExpenseAmount,
    long clothingExpenseAmount,
    long medicalExpenseAmount,
    long householdExpenseAmount,
    long transportationExpenseAmount,
    long leisureExpenseAmount,
    long cultureExpenseAmount,
    long educationExpenseAmount,
    long entertainmentExpenseAmount
) {}

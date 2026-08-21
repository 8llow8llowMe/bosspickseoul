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
    long monthlyAverageIncomeAmount,
    int incomeBracketCode,
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

}

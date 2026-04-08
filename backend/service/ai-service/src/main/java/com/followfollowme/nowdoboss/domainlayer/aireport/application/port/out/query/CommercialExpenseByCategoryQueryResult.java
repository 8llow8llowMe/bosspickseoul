package com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Builder;

@JsonIgnoreProperties(ignoreUnknown = true)
@Builder
public record CommercialExpenseByCategoryQueryResult(
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


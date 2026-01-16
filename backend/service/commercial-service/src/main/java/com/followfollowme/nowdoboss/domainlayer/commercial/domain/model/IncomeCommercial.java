package com.followfollowme.nowdoboss.domainlayer.commercial.domain.model;

import lombok.Builder;

@Builder
public record IncomeCommercial(
    long id,
    String periodCode,
    String commercialClassificationCode,
    String commercialClassificationCodeName,
    String commercialCode,
    String commercialCodeName,
    long monthAvgIncome,
    int incomeSectionCode,
    long totalPrice,
    long groceryPrice,
    long clothesPrice,
    long medicalPrice,
    long lifePrice,
    long trafficPrice,
    long leisurePrice,
    long culturePrice,
    long educationPrice,
    long luxuryPrice
) {

}

package com.followfollowme.nowdoboss.domainlayer.commercial.application.info;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.IncomeCommercial;
import lombok.Builder;

@Builder
public record CommercialCategorySpendingInfo(
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

    public static CommercialCategorySpendingInfo from(IncomeCommercial incomeCommercial) {
        return CommercialCategorySpendingInfo.builder()
            .groceryPrice(incomeCommercial.groceryPrice())
            .clothesPrice(incomeCommercial.clothesPrice())
            .medicalPrice(incomeCommercial.medicalPrice())
            .lifePrice(incomeCommercial.lifePrice())
            .trafficPrice(incomeCommercial.trafficPrice())
            .leisurePrice(incomeCommercial.leisurePrice())
            .culturePrice(incomeCommercial.culturePrice())
            .educationPrice(incomeCommercial.educationPrice())
            .luxuryPrice(incomeCommercial.luxuryPrice())
            .build();
    }
}

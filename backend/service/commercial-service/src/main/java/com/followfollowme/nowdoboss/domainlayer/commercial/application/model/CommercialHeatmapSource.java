package com.followfollowme.nowdoboss.domainlayer.commercial.application.model;

import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.facility.CommercialFacilityInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.income.CommercialIncomeAndExpenseInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.population.CommercialResidentPopulationInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales.CommercialSalesInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.summary.CommercialStoreAnalysisInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.ChangeCommercial;

public record CommercialHeatmapSource(
    String commercialCode,
    String commercialName,
    CommercialSalesInfo sales,
    CommercialFootTrafficInfo footTraffic,
    CommercialStoreAnalysisInfo store,
    CommercialResidentPopulationInfo population,
    CommercialIncomeAndExpenseInfo income,
    CommercialFacilityInfo facility,
    ChangeCommercial changeCommercial
) {

    public static CommercialHeatmapSource empty(String commercialCode) {
        return new CommercialHeatmapSource(commercialCode, commercialCode, null, null, null, null, null, null, null);
    }

    public boolean hasAllMetrics() {
        return sales != null && footTraffic != null && store != null
            && population != null && income != null && facility != null;
    }
}

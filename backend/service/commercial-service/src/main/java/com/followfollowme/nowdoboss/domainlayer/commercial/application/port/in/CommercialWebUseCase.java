package com.followfollowme.nowdoboss.domainlayer.commercial.application.port.in;

import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialFacilityResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialFootTrafficResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialIncomeAndExpenseResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialResidentPopulationResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialSalesResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialIncomeSummaryResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialSalesSummaryResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialStoreAnalysisResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialServiceCategoryResponse;
import java.util.List;

public interface CommercialWebUseCase {

    List<CommercialServiceCategoryResponse> getServiceCategoriesByCommercialCode(String commercialCode);

    CommercialFootTrafficResponse getFootTrafficByPeriodCodeAndCommercialCode(String periodCode, String commercialCode);

    CommercialSalesResponse getSalesByPeriodCodeAndCommercialCodeAndServiceCode(String periodCode, String commercialCode, String serviceCode);

    CommercialFacilityResponse getFacilityByPeriodAndCommercialCode(String periodCode, String commercialCode);

    CommercialResidentPopulationResponse getPopulationByPeriodAndCommercialCode(String periodCode, String commercialCode);

    CommercialIncomeAndExpenseResponse getIncomeByPeriodCodeAndCommercialCode(String periodCode, String commercialCode);

    CommercialStoreAnalysisResponse getStoreByPeriodCodeAndCommercialCodeAndServiceCode(String periodCode, String commercialCode, String serviceCode);

    CommercialSalesSummaryResponse getSalesSummary(String periodCode, String districtCode, String administrationCode, String commercialCode, String serviceCode);

    CommercialIncomeSummaryResponse getIncomeSummary(String periodCode, String districtCode, String administrationCode, String commercialCode);
}

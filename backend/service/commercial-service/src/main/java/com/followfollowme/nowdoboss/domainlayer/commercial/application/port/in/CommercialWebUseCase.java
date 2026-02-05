package com.followfollowme.nowdoboss.domainlayer.commercial.application.port.in;

import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.FacilityResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.FootTrafficResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.IncomeAndExpenseResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.ResidentPopulationResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.SalesResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.ServiceCategoryResponse;
import java.util.List;

public interface CommercialWebUseCase {

    List<ServiceCategoryResponse> getServiceCategoriesByCommercialCode(String commercialCode);

    FootTrafficResponse getFootTrafficByPeriodCodeAndCommercialCode(String periodCode, String commercialCode);

    SalesResponse getSalesByPeriodCodeAndCommercialCodeAndServiceCode(String periodCode, String commercialCode, String serviceCode);

    FacilityResponse getFacilityByPeriodAndCommercialCode(String periodCode, String commercialCode);

    ResidentPopulationResponse getPopulationByPeriodAndCommercialCode(String periodCode, String commercialCode);

    IncomeAndExpenseResponse getIncomeByPeriodCodeAndCommercialCode(String periodCode, String commercialCode);
}

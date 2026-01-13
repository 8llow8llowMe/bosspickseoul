package com.followfollowme.nowdoboss.domainlayer.commercial.application.port.in;

import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialFootTrafficResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialSalesResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialServiceCategoryResponse;
import java.util.List;

public interface CommercialWebUseCase {

    List<CommercialServiceCategoryResponse> getServiceCategoriesByCommercialCode(String commercialCode);

    CommercialFootTrafficResponse getFootTrafficByPeriodCodeAndCommercialCode(String periodCode, String commercialCode);

    CommercialSalesResponse getSalesByPeriodCodeAndCommercialCodeAndServiceCode(String periodCode, String commercialCode, String serviceCode);
}

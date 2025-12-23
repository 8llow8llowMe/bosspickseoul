package com.followfollowme.nowdoboss.domainlayer.commercial.application.port.in;

import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialServiceCategoryResponse;
import java.util.List;

public interface CommercialWebUseCase {

    List<CommercialServiceCategoryResponse> getServiceCategoriesByCommercialCode(String commercialCode);
}

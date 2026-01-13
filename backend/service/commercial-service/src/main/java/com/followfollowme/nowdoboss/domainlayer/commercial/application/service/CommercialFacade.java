package com.followfollowme.nowdoboss.domainlayer.commercial.application.service;

import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialFootTrafficResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialSalesResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialServiceCategoryResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.presenter.CommercialPresenter;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.CommercialFootTrafficInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.CommercialSalesInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.CommercialServiceCategoryInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.port.in.CommercialWebUseCase;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.service.processor.CommercialQueryProcessor;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CommercialFacade implements CommercialWebUseCase {

    private final CommercialQueryProcessor commercialQueryProcessor;
    private final CommercialPresenter commercialPresenter;

    @Override
    @Transactional(readOnly = true)
    public List<CommercialServiceCategoryResponse> getServiceCategoriesByCommercialCode(String commercialCode) {
        List<CommercialServiceCategoryInfo> infos = commercialQueryProcessor.getServiceCategoriesByCommercialCode(commercialCode);
        return commercialPresenter.toServiceCategoryResponses(infos);
    }

    @Override
    @Transactional(readOnly = true)
    public CommercialFootTrafficResponse getFootTrafficByPeriodCodeAndCommercialCode(String periodCode, String commercialCode) {
        CommercialFootTrafficInfo info = commercialQueryProcessor.getFootTrafficByPeriodCodeAndCommercialCode(periodCode, commercialCode);
        return commercialPresenter.toFootTrafficResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public CommercialSalesResponse getSalesByPeriodCodeAndCommercialCodeAndServiceCode(String periodCode, String commercialCode, String serviceCode) {
        CommercialSalesInfo info = commercialQueryProcessor.getSalesByPeriodCodeAndCommercialCodeAndServiceCode(periodCode, commercialCode, serviceCode);
        return null;
    }
}

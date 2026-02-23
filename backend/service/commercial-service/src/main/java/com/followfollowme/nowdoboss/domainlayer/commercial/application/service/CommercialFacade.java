package com.followfollowme.nowdoboss.domainlayer.commercial.application.service;

import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialFacilityResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialFootTrafficResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialIncomeAndExpenseResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialResidentPopulationResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialSalesResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialServiceCategoryResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.presenter.CommercialPresenter;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.facility.CommercialFacilityInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.foottraffic.CommercialFootTrafficInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.income.CommercialIncomeAndExpenseInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.population.CommercialResidentPopulationInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales.CommercialSalesInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.store.CommercialServiceCategoryInfo;
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
        return commercialPresenter.toCommercialServiceCategoryResponses(infos);
    }

    @Override
    @Transactional(readOnly = true)
    public CommercialFootTrafficResponse getFootTrafficByPeriodCodeAndCommercialCode(String periodCode, String commercialCode) {
        CommercialFootTrafficInfo info = commercialQueryProcessor.getFootTrafficByPeriodCodeAndCommercialCode(periodCode, commercialCode);
        return commercialPresenter.toCommercialFootTrafficResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public CommercialSalesResponse getSalesByPeriodCodeAndCommercialCodeAndServiceCode(String periodCode, String commercialCode, String serviceCode) {
        CommercialSalesInfo info = commercialQueryProcessor.getSalesByPeriodCodeAndCommercialCodeAndServiceCode(periodCode, commercialCode, serviceCode);
        return commercialPresenter.toCommercialSalesResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public CommercialFacilityResponse getFacilityByPeriodAndCommercialCode(String periodCode, String commercialCode) {
        CommercialFacilityInfo info = commercialQueryProcessor.getFacilityByPeriodAndCommercialCode(periodCode, commercialCode);
        return commercialPresenter.toCommercialFacilityResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public CommercialResidentPopulationResponse getPopulationByPeriodAndCommercialCode(String periodCode, String commercialCode) {
        CommercialResidentPopulationInfo info = commercialQueryProcessor.getPopulationByPeriodAndCommercialCode(periodCode, commercialCode);
        return commercialPresenter.toCommercialPopulationResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public CommercialIncomeAndExpenseResponse getIncomeByPeriodCodeAndCommercialCode(String periodCode, String commercialCode) {
        CommercialIncomeAndExpenseInfo info = commercialQueryProcessor.getIncomeByPeriodCodeAndCommercialCode(periodCode, commercialCode);
        return commercialPresenter.toCommercialIncomeResponse(info);
    }
}

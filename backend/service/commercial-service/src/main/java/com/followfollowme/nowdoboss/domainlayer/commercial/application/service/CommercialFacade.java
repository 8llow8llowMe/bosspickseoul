package com.followfollowme.nowdoboss.domainlayer.commercial.application.service;

import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.FacilityResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.FootTrafficResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.IncomeAndExpenseResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.ResidentPopulationResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.SalesResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.ServiceCategoryResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.presenter.CommercialPresenter;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.facility.FacilityInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.foottraffic.FootTrafficInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.income.IncomeAndExpenseInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.population.ResidentPopulationInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales.SalesInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.store.ServiceCategoryInfo;
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
    public List<ServiceCategoryResponse> getServiceCategoriesByCommercialCode(String commercialCode) {
        List<ServiceCategoryInfo> infos = commercialQueryProcessor.getServiceCategoriesByCommercialCode(commercialCode);
        return commercialPresenter.toServiceCategoryResponses(infos);
    }

    @Override
    @Transactional(readOnly = true)
    public FootTrafficResponse getFootTrafficByPeriodCodeAndCommercialCode(String periodCode, String commercialCode) {
        FootTrafficInfo info = commercialQueryProcessor.getFootTrafficByPeriodCodeAndCommercialCode(periodCode, commercialCode);
        return commercialPresenter.toFootTrafficResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public SalesResponse getSalesByPeriodCodeAndCommercialCodeAndServiceCode(String periodCode, String commercialCode, String serviceCode) {
        SalesInfo info = commercialQueryProcessor.getSalesByPeriodCodeAndCommercialCodeAndServiceCode(periodCode, commercialCode, serviceCode);
        return commercialPresenter.toSalesResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public FacilityResponse getFacilityByPeriodAndCommercialCode(String periodCode, String commercialCode) {
        FacilityInfo info = commercialQueryProcessor.getFacilityByPeriodAndCommercialCode(periodCode, commercialCode);
        return commercialPresenter.toFacilityResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public ResidentPopulationResponse getPopulationByPeriodAndCommercialCode(String periodCode, String commercialCode) {
        ResidentPopulationInfo info = commercialQueryProcessor.getPopulationByPeriodAndCommercialCode(periodCode, commercialCode);
        return commercialPresenter.toPopulationResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public IncomeAndExpenseResponse getIncomeByPeriodCodeAndCommercialCode(String periodCode, String commercialCode) {
        IncomeAndExpenseInfo info = commercialQueryProcessor.getIncomeByPeriodCodeAndCommercialCode(periodCode, commercialCode);
        return commercialPresenter.toIncomeResponse(info);
    }
}

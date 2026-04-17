package com.followfollowme.nowdoboss.domainlayer.aireport.application.service;

import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.dto.response.AdministrationAiReportResponse;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.dto.response.CommercialAiReportResponse;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.dto.response.CommercialComparisonAiReportResponse;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.dto.response.DistrictAiReportResponse;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.presenter.AiReportPresenter;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.in.AiReportWebUseCase;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.service.processor.AiReportProcessor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AiReportWebFacade implements AiReportWebUseCase {

    private final AiReportProcessor aiReportProcessor;
    private final AiReportPresenter aiReportPresenter;

    @Override
    public CommercialAiReportResponse getCommercialReport(String commercialCode, String serviceCode, String periodCode) {
        return aiReportPresenter.toCommercialResponse(aiReportProcessor.getCommercialReport(commercialCode, serviceCode, periodCode));
    }

    @Override
    public CommercialComparisonAiReportResponse getCommercialComparisonReport(
        String leftCommercialCode,
        String rightCommercialCode,
        String serviceCode,
        String periodCode
    ) {
        return aiReportPresenter.toCommercialComparisonResponse(
            aiReportProcessor.getCommercialComparisonReport(leftCommercialCode, rightCommercialCode, serviceCode, periodCode)
        );
    }

    @Override
    public DistrictAiReportResponse getDistrictReport(String districtCode, String periodCode) {
        return aiReportPresenter.toDistrictResponse(aiReportProcessor.getDistrictReport(districtCode, periodCode));
    }

    @Override
    public AdministrationAiReportResponse getAdministrationReport(String administrationCode, String periodCode) {
        return aiReportPresenter.toAdministrationResponse(aiReportProcessor.getAdministrationReport(administrationCode, periodCode));
    }
}

package com.followfollowme.bosspickseoul.domainlayer.aireport.application.service;

import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.in.web.dto.response.AiReportJobStatusResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.in.web.dto.response.AiReportSubmissionResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.in.web.presenter.AiReportPresenter;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.CommercialComparisonAiQuery;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.in.AiReportWebUseCase;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.service.processor.AiReportJobProcessor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AiReportWebFacade implements AiReportWebUseCase {

    private final AiReportJobProcessor aiReportJobProcessor;
    private final AiReportPresenter aiReportPresenter;

    @Override
    public AiReportSubmissionResponse submitCommercialReport(
        long memberId, String commercialCode, String serviceCode, String periodCode
    ) {
        return aiReportPresenter.toSubmissionResponse(
            aiReportJobProcessor.submitCommercialReport(memberId, commercialCode, serviceCode, periodCode)
        );
    }

    @Override
    public AiReportSubmissionResponse submitCommercialComparisonReport(long memberId, CommercialComparisonAiQuery query) {
        return aiReportPresenter.toSubmissionResponse(aiReportJobProcessor.submitCommercialComparisonReport(memberId, query));
    }

    @Override
    public AiReportSubmissionResponse submitDistrictReport(long memberId, String districtCode, String periodCode) {
        return aiReportPresenter.toSubmissionResponse(aiReportJobProcessor.submitDistrictReport(memberId, districtCode, periodCode));
    }

    @Override
    public AiReportSubmissionResponse submitAdministrationReport(long memberId, String administrationCode, String periodCode) {
        return aiReportPresenter.toSubmissionResponse(
            aiReportJobProcessor.submitAdministrationReport(memberId, administrationCode, periodCode)
        );
    }

    @Override
    public AiReportJobStatusResponse getJobStatusResponse(String jobId, long memberId) {
        return aiReportPresenter.toJobStatusResponse(aiReportJobProcessor.getJobInfo(jobId, memberId));
    }
}

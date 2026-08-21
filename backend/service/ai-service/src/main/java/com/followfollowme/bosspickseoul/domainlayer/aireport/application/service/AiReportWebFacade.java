package com.followfollowme.bosspickseoul.domainlayer.aireport.application.service;

import com.followfollowme.bosspickseoul.domainlayer.aireport.application.info.AiReportJobInfo;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.info.AiReportSubmissionInfo;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.AiReportJobSubscription;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.CommercialComparisonAiQuery;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.in.AiReportWebUseCase;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.service.processor.AiReportJobProcessor;
import java.util.function.Consumer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AiReportWebFacade implements AiReportWebUseCase {

    private final AiReportJobProcessor aiReportJobProcessor;

    @Override
    public AiReportSubmissionInfo submitCommercialReport(
        long memberId, String commercialCode, String serviceCode, String periodCode
    ) {
        return aiReportJobProcessor.submitCommercialReport(memberId, commercialCode, serviceCode, periodCode);
    }

    @Override
    public AiReportSubmissionInfo submitCommercialComparisonReport(long memberId, CommercialComparisonAiQuery query) {
        return aiReportJobProcessor.submitCommercialComparisonReport(memberId, query);
    }

    @Override
    public AiReportSubmissionInfo submitDistrictReport(long memberId, String districtCode, String periodCode) {
        return aiReportJobProcessor.submitDistrictReport(memberId, districtCode, periodCode);
    }

    @Override
    public AiReportSubmissionInfo submitAdministrationReport(long memberId, String administrationCode, String periodCode) {
        return aiReportJobProcessor.submitAdministrationReport(memberId, administrationCode, periodCode);
    }

    @Override
    public AiReportJobInfo getJobInfo(String jobId, long memberId) {
        return aiReportJobProcessor.getJobInfo(jobId, memberId);
    }

    @Override
    public AiReportJobSubscription subscribeJobUpdates(String jobId, long memberId, Consumer<AiReportJobInfo> onUpdate) {
        return aiReportJobProcessor.subscribeJobUpdates(jobId, memberId, onUpdate);
    }
}
